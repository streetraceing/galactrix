use super::{embedding_endpoint_saved, exponential_delay, is_retryable_status};

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
