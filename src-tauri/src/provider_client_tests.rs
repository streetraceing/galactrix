use super::{
    block_api_key, embedding_endpoint_saved, exponential_delay, first_available_key, is_empty_json,
    is_retryable_status, parse_api_keys, parse_embedding_response, parse_rate_limit_delay,
    rate_limit_state_from_headers, select_available_key, send_with_retry,
    uses_ollama_embedding_api, StreamChunkParser,
};
use crate::i18n::{keys, CommandResult};
use futures_util::{stream, StreamExt};
use reqwest::header::{HeaderMap, HeaderValue};
use serde_json::json;
use std::collections::HashSet;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::oneshot;

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

#[test]
fn sse_parser_accumulates_deltas_across_chunk_boundaries() {
    let mut parser = StreamChunkParser::new(false);

    let first = "data: {\"choices\":[{\"delta\":{\"content\":\"П\"}}]}\n\ndata: {\"choi";
    let parsed = parser.push(first.as_bytes());
    assert_eq!(parsed.delta, "П");
    assert!(!parsed.finished);
    assert_eq!(parsed.usage, None);

    let second = "ces\": [{\"delta\": {\"content\": \"и\"}}]}\n\ndata: [DONE]\n";
    let parsed = parser.push(second.as_bytes());
    assert_eq!(parsed.delta, "и");
    assert!(parsed.finished);
}

#[test]
fn sse_parser_extracts_final_usage_and_reports_errors() {
    let mut parser = StreamChunkParser::new(false);
    let payload = "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\ndata: {\"choices\": [], \"usage\": {\"prompt_tokens\": 12, \"completion_tokens\": 34}}\ndata: {\"error\": {\"message\": \"overloaded\"}}\n";
    let parsed = parser.push(payload.as_bytes());
    assert_eq!(parsed.delta, "Hi");
    assert_eq!(parsed.usage, Some((12, 34)));
    assert_eq!(parsed.error.as_deref(), Some("overloaded"));
}

#[test]
fn sse_parser_ignores_keepalives_and_stops_after_done() {
    let mut parser = StreamChunkParser::new(false);
    assert_eq!(parser.push(b": keep-alive\n\n").delta, "");
    assert!(parser.push(b"data: [DONE]\n").finished);
    assert!(parser
        .push(b"data: {\"choices\":[{\"delta\":{\"content\":\"late\"}}]}\n")
        .delta
        .is_empty());
}

#[test]
fn ollama_parser_reads_ndjson_lines_and_final_counts() {
    let mut parser = StreamChunkParser::new(true);
    let parsed = parser.push(
        "{\"message\":{\"content\":\"He\"}}\n{\"message\":{\"content\":\"y\"}}\n{\"done\":true,\"prompt_eval_count\":7,\"eval_count\":19}\n"
            .as_bytes(),
    );
    assert_eq!(parsed.delta, "Hey");
    assert!(parsed.finished);
    assert_eq!(parsed.usage, Some((7, 19)));

    // After the stream is finished, later bytes are ignored.
    let parsed = parser.push(b"{}\n");
    assert_eq!(parsed.delta, "");
    assert!(!parsed.finished);
}

#[test]
fn stream_parser_rejects_malformed_data_but_not_sse_metadata() {
    let mut parser = StreamChunkParser::new(false);
    let metadata = parser.push(b": keepalive\nevent: message\nid: 7\nretry: 1000\n\n");
    assert!(metadata.error.is_none());
    for (ollama, invalid) in [(false, "data: {bad}\n"), (true, "{bad}\n")] {
        let mut parser = StreamChunkParser::new(ollama);
        let parsed = parser.push(invalid.as_bytes());
        assert!(parsed.error.is_some());
        assert!(!parsed.finished);
        assert!(parser
            .push(b"data: [DONE]\n{\"done\":true}\n")
            .delta
            .is_empty());
        assert!(!parser.finish().finished);
    }
}

#[test]
fn stream_parser_stops_within_the_chunk_after_terminal_or_error() {
    for (ollama, prefix, terminal, suffix, error) in [
        (
            false,
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n",
            "data: [DONE]\n",
            "data: {bad}\n",
            None,
        ),
        (
            true,
            "{\"message\":{\"content\":\"Hi\"}}\n",
            "{\"done\":true,\"eval_count\":3}\n",
            "{bad}\n",
            None,
        ),
        (
            false,
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n",
            "data: {\"error\":{\"message\":\"failed\"}}\n",
            "data: [DONE]\n",
            Some("failed"),
        ),
        (
            true,
            "{\"message\":{\"content\":\"Hi\"}}\n",
            "{\"error\":\"failed\"}\n",
            "{\"message\":{\"content\":\"late\"},\"done\":true}\n",
            Some("failed"),
        ),
        (
            true,
            "{\"message\":{\"content\":\"Hi\"}}\n",
            "{\"error\":{\"message\":\"failed\"}}\n",
            "{\"done\":true}\n",
            Some("failed"),
        ),
    ] {
        let mut parser = StreamChunkParser::new(ollama);
        let parsed = parser.push(format!("{prefix}{terminal}{suffix}").as_bytes());
        assert_eq!(parsed.delta, "Hi");
        assert_eq!(parsed.error.as_deref(), error);
        assert_eq!(parsed.finished, error.is_none());
        assert!(parser.push(prefix.as_bytes()).delta.is_empty());
    }
}

fn read_test_stream(
    ollama: bool,
    chunks: Vec<Result<&[u8], &str>>,
) -> (CommandResult<super::StreamedCompletion>, String) {
    tauri::async_runtime::block_on(async {
        let (_sender, mut cancellation) = oneshot::channel();
        let mut deltas = String::new();
        let result = super::read_completion_stream(
            stream::iter(chunks),
            ollama,
            std::time::Instant::now(),
            &mut cancellation,
            |delta| deltas.push_str(delta),
        )
        .await;
        (result, deltas)
    })
}

#[test]
fn streaming_eof_accepts_trailing_completion_lines_and_preserves_usage() {
    for (ollama, body, counts) in [
        (false, "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\r\ndata: {\"usage\":{\"prompt_tokens\":2,\"completion_tokens\":3}}\ndata: [DONE]", (2, 3)),
        (false, "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"},\"finish_reason\":\"stop\"}]}\ndata: {\"usage\":{\"prompt_tokens\":4,\"completion_tokens\":5}}", (4, 5)),
        (true, "{\"message\":{\"content\":\"Hi\"},\"done\":true,\"prompt_eval_count\":6,\"eval_count\":7}", (6, 7)),
    ] {
        let (result, deltas) = read_test_stream(ollama, vec![Ok(body.as_bytes())]);
        let result = result.expect("valid completion at EOF");
        assert_eq!(result.completion.content, "Hi");
        assert_eq!(deltas, "Hi");
        assert_eq!((result.completion.input_tokens, result.completion.output_tokens), counts);
        assert!(!result.cancelled);
    }
}

#[test]
fn streaming_errors_flush_prior_content_even_in_the_same_chunk() {
    let content = "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n";
    for ending in [
        "data: {bad}\n",
        "data: {\"error\":{\"message\":\"failed\"}}\n",
        "data: {bad}",
    ] {
        let body = format!("{content}{ending}");
        for chunks in [
            vec![Ok(body.as_bytes())],
            vec![Ok(content.as_bytes()), Ok(ending.as_bytes())],
        ] {
            let (result, deltas) = read_test_stream(false, chunks);
            assert_eq!(result.unwrap_err().key, keys::PROVIDER_REQUEST_FAILED);
            assert_eq!(deltas, "Hi", "must notify fallback of actual content");
        }
    }
    let (result, deltas) =
        read_test_stream(false, vec![Ok(content.as_bytes()), Err("connection reset")]);
    assert_eq!(result.unwrap_err().key, keys::PROVIDER_RESPONSE_READ_FAILED);
    assert_eq!(deltas, "Hi");
}

#[test]
fn streaming_eof_rejects_partial_streams_without_protocol_completion() {
    for (ollama, body, expected_text) in [
        (
            false,
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n",
            "Hi",
        ),
        (
            false,
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}",
            "Hi",
        ),
        (true, "{\"message\":{\"content\":\"Hi\"}}", "Hi"),
        (false, ": keepalive\n", ""),
        (false, "", ""),
    ] {
        let (result, deltas) = read_test_stream(ollama, vec![Ok(body.as_bytes())]);
        assert_eq!(result.unwrap_err().key, keys::PROVIDER_RESPONSE_READ_FAILED);
        assert_eq!(deltas, expected_text);
    }
    let (result, deltas) = read_test_stream(false, vec![Ok(b"data: {\"choices\":[")]);
    assert_eq!(result.unwrap_err().key, keys::PROVIDER_REQUEST_FAILED);
    assert!(deltas.is_empty());
}

#[test]
fn streaming_cancellation_keeps_unflushed_partial_text() {
    tauri::async_runtime::block_on(async {
        let (sender, mut cancellation) = oneshot::channel();
        let first: Result<&[u8], &str> =
            Ok(b"data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n");
        let body = stream::iter([first]).chain(stream::once(async move {
            sender.send(()).expect("cancel stream");
            std::future::pending::<Result<&[u8], &str>>().await
        }));
        let mut deltas = String::new();
        let result = tokio::time::timeout(
            Duration::from_secs(2),
            super::read_completion_stream(
                body,
                false,
                std::time::Instant::now(),
                &mut cancellation,
                |delta| deltas.push_str(delta),
            ),
        )
        .await
        .expect("cancellation should interrupt the pending read")
        .expect("partial result");
        assert!(result.cancelled);
        assert_eq!(result.completion.content, "Hi");
        assert_eq!(deltas, "Hi");
    });
}

#[test]
fn cancellation_wins_before_polling_a_ready_operation() {
    tauri::async_runtime::block_on(async {
        let (sender, mut cancellation) = oneshot::channel();
        sender.send(()).expect("pre-cancel");
        let result = super::until_cancelled(
            async { panic!("must not poll operation") },
            &mut cancellation,
        )
        .await;
        assert!(result.is_none());

        let (sender, mut cancellation) = oneshot::channel();
        drop(sender);
        assert!(
            super::until_cancelled(std::future::ready(()), &mut cancellation)
                .await
                .is_none()
        );
    });
}

fn read_mock_request(socket: &mut std::net::TcpStream) {
    use std::io::BufRead;
    socket
        .set_read_timeout(Some(Duration::from_secs(3)))
        .unwrap();
    let mut reader = std::io::BufReader::new(socket);
    let mut content_length = 0;
    loop {
        let mut line = String::new();
        assert!(reader.read_line(&mut line).unwrap() > 0);
        if line == "\r\n" {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                content_length = value.trim().parse::<usize>().unwrap();
            }
        }
    }
    reader.read_exact(&mut vec![0; content_length]).unwrap();
}

fn no_retry() -> crate::models::RetrySettings {
    crate::models::RetrySettings {
        enabled: false,
        max_attempts: 1,
        initial_delay_ms: 100,
        max_delay_ms: 100,
    }
}

#[test]
fn streaming_http_cancellation_interrupts_headers_json_body_and_retry_waits() {
    tauri::async_runtime::block_on(async {
        for prefix in [
            "",
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{",
            "HTTP/1.1 429 Too Many Requests\r\nRetry-After: 60\r\nContent-Length: 0\r\n\r\n",
            "HTTP/1.1 400 Bad Request\r\nContent-Length: 1000\r\n\r\n{",
        ] {
            let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock");
            let address = listener.local_addr().unwrap();
            let (ready_tx, ready_rx) = oneshot::channel();
            let (release_tx, release_rx) = std::sync::mpsc::channel();
            let server = std::thread::spawn(move || {
                let (mut socket, _) = listener.accept().expect("accept completion");
                read_mock_request(&mut socket);
                socket
                    .write_all(prefix.as_bytes())
                    .expect("write partial response");
                ready_tx.send(()).unwrap();
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                listener.set_nonblocking(true).unwrap();
                assert_eq!(
                    listener.accept().unwrap_err().kind(),
                    std::io::ErrorKind::WouldBlock,
                    "cancelled retry must not send another request"
                );
            });
            let mut saved = provider("custom", None);
            saved.id = format!("cancel-{address}");
            saved.base_url = Some(format!("http://{address}/v1"));
            let mut retry = no_retry();
            retry.enabled = true;
            retry.max_attempts = 2;
            let (sender, mut cancellation) = oneshot::channel();
            let mut deltas = String::new();
            let cancel = async {
                ready_rx.await.expect("server saw request");
                // Let response headers reach the client before cancelling the body/backoff.
                tokio::time::sleep(Duration::from_millis(30)).await;
                sender.send(()).expect("cancel pending transport");
            };
            let (result, ()) = tokio::join!(
                tokio::time::timeout(
                    Duration::from_secs(2),
                    super::complete_streaming(
                        &saved,
                        None,
                        &[],
                        None,
                        Some("Hi"),
                        &retry,
                        &mut cancellation,
                        |delta| deltas.push_str(delta),
                    )
                ),
                cancel,
            );
            release_tx.send(()).unwrap();
            server.join().expect("mock server completed");
            let result = result
                .expect("transport must not wait for delayed response")
                .expect("cancelled completion");
            assert!(result.cancelled);
            assert!(result.completion.content.is_empty());
            assert!(deltas.is_empty());
        }
    });
}

#[test]
fn streaming_parser_handles_split_utf8_and_finish_markers() {
    let body = "data: {\"choices\":[{\"delta\":{\"content\":\"Привет\"}}]}\r\ndata: [DONE]";
    for split in 0..=body.len() {
        let (result, deltas) = read_test_stream(
            false,
            vec![Ok(&body.as_bytes()[..split]), Ok(&body.as_bytes()[split..])],
        );
        assert_eq!(result.unwrap().completion.content, "Привет");
        assert_eq!(deltas, "Привет");
    }
}

#[test]
fn fallback_never_restarts_after_content_even_when_error_shares_a_chunk() {
    tauri::async_runtime::block_on(async {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let fallback_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        fallback_listener.set_nonblocking(true).unwrap();
        let server = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            read_mock_request(&mut socket);
            let body = "data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\ndata: {\"error\":{\"message\":\"failed\"}}\n";
            write!(socket, "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
        });
        let mut primary = provider("custom", None);
        primary.id = uuid::Uuid::new_v4().to_string();
        primary.base_url = Some(format!("http://{address}/v1"));
        let mut fallback = primary.clone();
        fallback.id = uuid::Uuid::new_v4().to_string();
        fallback.base_url = Some(format!(
            "http://{}/v1",
            fallback_listener.local_addr().unwrap()
        ));
        let state = crate::runtime::AppState::new(
            rusqlite::Connection::open_in_memory().unwrap(),
            Default::default(),
        );
        let deltas = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
        let captured = deltas.clone();
        let channel = tauri::ipc::Channel::new(move |response| {
            if let tauri::ipc::InvokeResponseBody::Json(value) = response {
                let value: serde_json::Value = serde_json::from_str(&value).unwrap();
                captured
                    .lock()
                    .unwrap()
                    .push_str(value["delta"].as_str().unwrap());
            }
            Ok(())
        });
        let (_sender, mut cancellation) = oneshot::channel();
        let result = tokio::time::timeout(
            Duration::from_secs(3),
            crate::stream_with_fallback(
                &state,
                &[primary, fallback],
                &[],
                None,
                Some("Hi"),
                &no_retry(),
                &mut cancellation,
                &channel,
                "test-message",
            ),
        )
        .await
        .expect("stream must return promptly");
        server.join().unwrap();
        assert_eq!(result.unwrap_err().key, keys::PROVIDER_REQUEST_FAILED);
        assert_eq!(*deltas.lock().unwrap(), "Hi");
        assert_eq!(
            fallback_listener.accept().unwrap_err().kind(),
            std::io::ErrorKind::WouldBlock
        );
    });
}

#[test]
fn completion_chain_applies_sparse_overrides_to_every_provider() {
    use crate::models::ChatGenerationSettings;
    let database = crate::db::open(std::path::Path::new(":memory:")).unwrap();
    let primary = provider("custom", None);
    let mut fallback = provider("ollama", None);
    fallback.id = "fallback".into();
    fallback.model = "fallback-model".into();
    fallback.base_url = Some("http://127.0.0.1:11434/api".into());
    fallback.temperature = 0.2;
    fallback.top_p = 0.6;
    fallback.max_tokens = 2048;
    crate::db::save_provider(&database, &fallback).unwrap();
    let mut unsupported = provider("character-ai", None);
    unsupported.id = "unsupported".into();
    crate::db::save_provider(&database, &unsupported).unwrap();
    for overrides in [
        ChatGenerationSettings::default(),
        ChatGenerationSettings {
            temperature: Some(0.0),
            ..Default::default()
        },
        ChatGenerationSettings {
            top_p: Some(0.4),
            max_tokens: Some(64),
            ..Default::default()
        },
    ] {
        let settings = ChatGenerationSettings {
            fallback_provider_ids: vec![
                " provider ".into(),
                " fallback ".into(),
                "fallback".into(),
                "missing".into(),
                "unsupported".into(),
                "".into(),
            ],
            ..overrides
        };
        let chain = crate::resolve_completion_chain(&database, &primary, &settings).unwrap();
        assert_eq!(chain.len(), 2);
        for (resolved, original) in chain.iter().zip([&primary, &fallback]) {
            assert_eq!(resolved.id, original.id);
            assert_eq!(resolved.kind, original.kind);
            assert_eq!(resolved.model, original.model);
            assert_eq!(resolved.base_url, original.base_url);
            assert_eq!(
                resolved.temperature,
                settings.temperature.unwrap_or(original.temperature)
            );
            assert_eq!(resolved.top_p, settings.top_p.unwrap_or(original.top_p));
            assert_eq!(
                resolved.max_tokens,
                settings.max_tokens.unwrap_or(original.max_tokens)
            );
        }
    }
    assert_eq!(
        crate::db::get_provider(&database, &fallback.id)
            .unwrap()
            .temperature,
        0.2
    );
}

#[test]
fn fallback_checks_cancellation_before_secret_errors_or_provider_requests() {
    tauri::async_runtime::block_on(async {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let mut fallback = provider("custom", None);
        fallback.base_url = Some(format!("http://{}/v1", listener.local_addr().unwrap()));
        let state = crate::runtime::AppState::new(
            rusqlite::Connection::open_in_memory().unwrap(),
            Default::default(),
        );
        let channel = tauri::ipc::Channel::new(|_| panic!("cancelled attempt cannot emit content"));
        for closed in [false, true] {
            let (sender, mut cancellation) = oneshot::channel();
            if closed {
                drop(sender);
            } else {
                sender.send(()).unwrap();
            }
            let error = crate::stream_with_fallback(
                &state,
                &[provider("mistral", None), fallback.clone()],
                &[],
                None,
                Some("Hi"),
                &no_retry(),
                &mut cancellation,
                &channel,
                "test-message",
            )
            .await
            .unwrap_err();
            assert_eq!(error.key, keys::PROVIDER_REQUEST_CANCELLED);
            assert_eq!(
                listener.accept().unwrap_err().kind(),
                std::io::ErrorKind::WouldBlock
            );
        }
    });
}
