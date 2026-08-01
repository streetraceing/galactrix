use super::{
    embedding_endpoint_saved, exponential_delay, is_retryable_status, parse_embedding_response,
    uses_ollama_embedding_api,
};
use serde_json::json;

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
