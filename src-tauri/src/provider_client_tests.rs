use super::{
    block_api_key, embedding_endpoint_saved, exponential_delay, first_available_key, is_empty_json,
    is_retryable_status, parse_api_keys, parse_embedding_response, parse_rate_limit_delay,
    rate_limit_state_from_headers, select_available_key, send_with_retry,
    uses_ollama_embedding_api,
};
use reqwest::header::{HeaderMap, HeaderValue};
use serde_json::json;
use std::collections::HashSet;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[test]
fn rate_limited_key_rotates_even_when_retry_module_is_disabled() {
    tauri::async_runtime::block_on(async {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind test server");
        let address = listener.local_addr().expect("test server address");
        let seen = std::sync::Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
        let server_seen = seen.clone();
        let server = std::thread::spawn(move || {
            for index in 0..2 {
                let (mut stream, _) = listener.accept().expect("accept request");
                let mut request = [0_u8; 4096];
                let bytes = stream.read(&mut request).expect("read request");
                server_seen
                    .lock()
                    .expect("request log")
                    .push(String::from_utf8_lossy(&request[..bytes]).to_lowercase());

                let (status, retry_after, body) = if index == 0 {
                    (
                        "429 Too Many Requests",
                        "Retry-After: 60\r\n",
                        r#"{"error":{"message":"rate limited"}}"#,
                    )
                } else {
                    ("200 OK", "", r#"{"ok":true}"#)
                };
                write!(
                    stream,
                    "HTTP/1.1 {status}\r\nContent-Type: application/json\r\n{retry_after}Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len(),
                )
                .expect("write response");
            }
        });

        let client = reqwest::Client::new();
        let url = format!("http://{address}/rotate");
        let settings = crate::models::RetrySettings {
            enabled: false,
            max_attempts: 1,
            initial_delay_ms: 100,
            max_delay_ms: 100,
        };
        let pool = format!("disabled-retry-key-rotation-{}", std::process::id());

        let response = send_with_retry(
            &pool,
            Some("alpha\nbeta"),
            |selected_key| match selected_key {
                Some(key) => client.get(&url).bearer_auth(key),
                None => client.get(&url),
            },
            &settings,
            crate::i18n::keys::PROVIDER_REQUEST_FAILED,
        )
        .await
        .expect("second API key should recover the request");

        assert_eq!(response.status, 200);
        assert_eq!(response.value, json!({ "ok": true }));
        server.join().expect("test server should stop");

        let requests = seen.lock().expect("request log");
        assert_eq!(requests.len(), 2);
        assert!(requests[0].contains("authorization: bearer alpha"));
        assert!(requests[1].contains("authorization: bearer beta"));
    });
}

#[test]
fn exponential_backoff_doubles_and_respects_the_cap() {
    assert_eq!(exponential_delay(750, 8_000, 1).as_millis(), 750);
    assert_eq!(exponential_delay(750, 8_000, 2).as_millis(), 1_500);
    assert_eq!(exponential_delay(750, 8_000, 3).as_millis(), 3_000);
    assert_eq!(exponential_delay(750, 8_000, 6).as_millis(), 8_000);
}

#[test]
fn only_temporary_http_failures_are_retried() {
    for status in [408, 409, 425, 429, 500, 502, 503, 599] {
        assert!(is_retryable_status(status), "{status} should retry");
    }
    for status in [400, 401, 403, 404, 422, 600] {
        assert!(!is_retryable_status(status), "{status} should not retry");
    }
}

#[test]
fn empty_success_payloads_are_treated_as_incomplete_responses() {
    for value in [json!(null), json!("  "), json!([]), json!({})] {
        assert!(is_empty_json(&value));
    }
    assert!(!is_empty_json(&json!({ "choices": [] })));
}

#[test]
fn malformed_success_body_is_retried_before_it_reaches_the_caller() {
    tauri::async_runtime::block_on(async {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind test server");
        let address = listener.local_addr().expect("test server address");
        let server = std::thread::spawn(move || {
            for body in ["{", r#"{"ok":true}"#] {
                let (mut stream, _) = listener.accept().expect("accept request");
                let mut request = [0_u8; 2048];
                let _ = stream.read(&mut request).expect("read request");
                write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                )
                .expect("write response");
            }
        });
        let client = reqwest::Client::new();
        let url = format!("http://{address}/retry");
        let settings = crate::models::RetrySettings {
            enabled: true,
            max_attempts: 2,
            initial_delay_ms: 100,
            max_delay_ms: 100,
        };

        let response = send_with_retry(
            "malformed-success-body",
            None,
            |_| client.get(&url),
            &settings,
            crate::i18n::keys::PROVIDER_REQUEST_FAILED,
        )
        .await
        .expect("second response should succeed");

        assert_eq!(response.value, json!({ "ok": true }));
        server.join().expect("test server should stop");
    });
}

fn provider(kind: &str, embedding_base_url: Option<&str>) -> crate::models::Provider {
    crate::models::Provider {
        id: "provider".into(),
        name: "Provider".into(),
        kind: kind.into(),
        model: "model".into(),
        status: "connected".into(),
        base_url: if kind == "custom" {
            Some("http://127.0.0.1:1234/v1".into())
        } else {
            None
        },
        account_id: None,
        latency_ms: None,
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 1024,
        embedding_model: Some("embedding-model".into()),
        embedding_base_url: embedding_base_url.map(str::to_owned),
        has_secret: false,
    }
}

#[test]
fn custom_embedding_endpoint_is_used_exactly() {
    let saved = provider("ollama", Some("http://127.0.0.1:11534/api/embed"));
    assert_eq!(
        embedding_endpoint_saved(&saved).expect("endpoint"),
        "http://127.0.0.1:11534/api/embed"
    );
}

#[test]
fn embedding_endpoint_uses_provider_defaults_only_when_empty() {
    assert_eq!(
        embedding_endpoint_saved(&provider("ollama", None)).expect("ollama endpoint"),
        "http://localhost:11434/api/embed"
    );
    assert_eq!(
        embedding_endpoint_saved(&provider("custom", None)).expect("openai endpoint"),
        "http://127.0.0.1:1234/v1/embeddings"
    );
}

#[test]
fn ollama_embed_response_is_parsed_for_custom_endpoints() {
    let saved = provider("custom", Some("http://127.0.0.1:11534/api/embed"));
    assert!(uses_ollama_embedding_api(
        &saved,
        "http://127.0.0.1:11534/api/embed"
    ));

    let parsed = parse_embedding_response(&json!({
        "model": "nomic-embed-text",
        "embeddings": [[0.1, 0.2, 0.3]]
    }))
    .expect("ollama embed response");
    assert_eq!(parsed, vec![vec![0.1, 0.2, 0.3]]);
}

#[test]
fn legacy_ollama_embedding_response_is_also_supported() {
    let parsed = parse_embedding_response(&json!({
        "embedding": [0.25, 0.5, 0.75]
    }))
    .expect("legacy ollama response");
    assert_eq!(parsed, vec![vec![0.25, 0.5, 0.75]]);
}

#[test]
fn openai_embedding_response_keeps_index_order() {
    let parsed = parse_embedding_response(&json!({
        "data": [
            { "index": 1, "embedding": [0.3, 0.4] },
            { "index": 0, "embedding": [0.1, 0.2] }
        ]
    }))
    .expect("openai response");
    assert_eq!(parsed, vec![vec![0.1, 0.2], vec![0.3, 0.4]]);
}

#[test]
fn api_key_lists_are_trimmed_and_deduplicated_in_priority_order() {
    assert_eq!(
        parse_api_keys(Some(" primary \nsecondary\nprimary\n\n third ")),
        vec!["primary", "secondary", "third"]
    );
}

#[test]
fn rate_limit_reset_headers_support_provider_duration_formats() {
    assert_eq!(
        parse_rate_limit_delay("250ms").expect("milliseconds"),
        Duration::from_millis(250)
    );
    assert_eq!(
        parse_rate_limit_delay("1m30s").expect("compound duration"),
        Duration::from_secs(90)
    );
    assert!(parse_rate_limit_delay("2099-01-01T00:00:00Z").is_some());
    let future = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("unix time")
        .as_secs_f64()
        + 2.0;
    let parsed = parse_rate_limit_delay(&future.to_string()).expect("epoch reset");
    assert!(parsed <= Duration::from_secs(2));
}

#[test]
fn exhausted_rate_limit_dimensions_use_their_matching_reset_window() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-ratelimit-remaining-requests",
        HeaderValue::from_static("10"),
    );
    headers.insert(
        "x-ratelimit-reset-requests",
        HeaderValue::from_static("10s"),
    );
    headers.insert(
        "x-ratelimit-remaining-tokens",
        HeaderValue::from_static("0"),
    );
    headers.insert("x-ratelimit-reset-tokens", HeaderValue::from_static("2m"));

    let state = rate_limit_state_from_headers(200, &headers);
    assert!(state.exhausted);
    assert_eq!(state.reset_after, Some(Duration::from_secs(120)));
}

#[test]
fn a_temporarily_limited_primary_key_yields_to_the_next_key() {
    let pool = format!("test-pool-{}", std::process::id());
    let keys = vec!["primary".to_owned(), "secondary".to_owned()];
    let excluded = HashSet::new();
    assert_eq!(first_available_key(&pool, &keys, &excluded), Some(0));
    block_api_key(&pool, &keys[0], Duration::from_millis(100));
    assert_eq!(first_available_key(&pool, &keys, &excluded), Some(1));
    std::thread::sleep(Duration::from_millis(120));
    assert_eq!(first_available_key(&pool, &keys, &excluded), Some(0));
}

#[test]
fn available_api_keys_rotate_instead_of_burning_the_first_key() {
    let pool = format!("round-robin-pool-{}", std::process::id());
    let keys = vec!["first".to_owned(), "second".to_owned(), "third".to_owned()];
    let excluded = HashSet::new();

    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(0));
    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(1));
    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(2));
    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(0));

    block_api_key(&pool, &keys[1], Duration::from_secs(1));
    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(2));
    assert_eq!(select_available_key(&pool, &keys, &excluded), Some(0));
}
