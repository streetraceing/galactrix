//! Shared wire configuration for buffered and streaming requests.
use reqwest::RequestBuilder;
use serde_json::{json, Value};
use crate::models::{Provider, ProviderOptions};

pub(super) fn configured_request(mut request: RequestBuilder, options: &ProviderOptions, key: Option<&str>) -> RequestBuilder {
    for (name, value) in &options.headers {
        request = request.header(name.as_str(), value.as_str());
    }
    if !options.no_auth {
        if let Some(key) = key.map(str::trim).filter(|s| !s.is_empty()) {
            let prefix = options.auth_prefix.as_deref().unwrap_or("Bearer");
            let value = if prefix.is_empty() { key.to_owned() } else { format!("{prefix} {key}") };
            // Invalid headers fail the request instead of silently dropping authentication.
            let value = reqwest::header::HeaderValue::from_str(&value).map(|mut value| { value.set_sensitive(true); value });
            request = match value {
                Ok(value) => request.header(options.auth_header.as_deref().unwrap_or("Authorization"), value),
                Err(_) => request.header("Authorization", "invalid\nheader"),
            };
        }
    }
    request
}

/// RFC 7396-style recursive override: null removes a field, arrays replace.
/// Routing, model, messages and stream are validated separately and immutable.
pub(super) fn merge_body(target: &mut Value, patch: &serde_json::Map<String, Value>) {
    let Some(object) = target.as_object_mut() else { return; };
    for (key, value) in patch {
        if value.is_null() { object.remove(key); }
        else if let Some(nested) = value.as_object() {
            let slot = object.entry(key.clone()).or_insert_with(|| json!({}));
            if !slot.is_object() { *slot = json!({}); }
            merge_body(slot, nested);
        } else { object.insert(key.clone(), value.clone()); }
    }
}

pub(super) fn completion_body(provider: &Provider, messages: &[Value], stream: bool) -> Value {
    let options = &provider.options;
    let ollama = matches!(provider.kind.as_str(), "ollama" | "ollama-cloud");
    let mut body = json!({"model": provider.model, "messages": messages, "stream": stream});
    if ollama {
        let mut sampling = json!({"num_predict": provider.max_tokens});
        if !options.omit_sampling {
            sampling["temperature"] = json!(provider.temperature);
            sampling["top_p"] = json!(provider.top_p);
        }
        for (name, value) in [("top_k", json!(options.top_k)), ("seed", json!(options.seed)),
            ("frequency_penalty", json!(options.frequency_penalty)), ("presence_penalty", json!(options.presence_penalty)),
            ("repeat_penalty", json!(options.repetition_penalty))] {
            if !value.is_null() { sampling[name] = value; }
        }
        if !options.stop.is_empty() { sampling["stop"] = json!(options.stop); }
        body["options"] = sampling;
        if let Some(effort) = &options.reasoning_effort {
            body["think"] = match effort.as_str() { "none" => json!(false), "low" | "medium" | "high" => json!(effort), _ => json!(true) };
        }
    } else {
        if !options.omit_sampling {
            body["temperature"] = json!(provider.temperature);
            body["top_p"] = json!(provider.top_p);
        }
        let tokens_field = options.max_tokens_field.as_deref().unwrap_or("max_tokens");
        if tokens_field != "omit" { body[tokens_field] = json!(provider.max_tokens); }
        for (name, value) in [("top_k", json!(options.top_k)), ("seed", json!(options.seed)),
            ("frequency_penalty", json!(options.frequency_penalty)), ("presence_penalty", json!(options.presence_penalty)),
            ("repetition_penalty", json!(options.repetition_penalty))] {
            if !value.is_null() { body[name] = value; }
        }
        if !options.stop.is_empty() { body["stop"] = json!(options.stop); }
        if provider.kind == "google-gemini" {
            if let Some(budget) = options.thinking_budget {
                // This is the raw HTTP body, not the OpenAI SDK extra_body argument.
                body["extra_body"] = json!({"google": {"thinking_config": {"thinking_budget": budget}}});
            } else if let Some(level) = &options.thinking_level {
                body["extra_body"] = json!({"google": {"thinking_config": {"thinking_level": level}}});
            } else if let Some(effort) = &options.reasoning_effort {
                body["reasoning_effort"] = json!(effort);
            }
        } else if provider.kind == "openrouter" && options.thinking_budget.is_some() {
            body["reasoning"] = json!({"max_tokens": options.thinking_budget});
        } else if let Some(effort) = &options.reasoning_effort {
            body["reasoning_effort"] = json!(effort);
        }
        // Opt out for servers that reject stream_options; legacy default retained.
        if stream && options.stream_usage.unwrap_or(true) { body["stream_options"] = json!({"include_usage": true}); }
    }
    merge_body(&mut body, &options.extra_body);
    body
}

pub(super) fn embedding_options(body: &mut Value, options: &ProviderOptions) {
    if let Some(dimensions) = options.embedding_dimensions { body["dimensions"] = json!(dimensions); }
    merge_body(body, &options.embedding_extra_body);
}

#[cfg(test)]
mod tests {
    use super::*;
    fn provider(kind: &str) -> Provider {
        serde_json::from_value(json!({"id":"p", "name":"p", "kind":kind,"model":"chat", "status":"connected",
          "baseUrl":null,"accountId":null,"latencyMs":null,"temperature":0.7,"topP":0.95,"maxTokens":4096,"hasSecret":false})).unwrap()
    }
    #[test]
    fn defaults_and_streaming_share_parameters() {
        for kind in ["mistral", "google-gemini", "cloudflare-workers-ai", "custom", "ollama"] {
            let mut p = provider(kind);
            p.options.reasoning_effort = Some("high".into());
            let mut buffered = completion_body(&p, &[], false);
            let mut streamed = completion_body(&p, &[], true);
            buffered.as_object_mut().unwrap().remove("stream");
            streamed.as_object_mut().unwrap().remove("stream");
            streamed.as_object_mut().unwrap().remove("stream_options");
            assert_eq!(buffered, streamed);
        }
    }
    #[test]
    fn gemini_budget_does_not_conflict_with_effort() {
        let mut p = provider("google-gemini");
        p.options.reasoning_effort = Some("high".into());
        p.options.thinking_budget = Some(0);
        let body = completion_body(&p, &[], true);
        assert!(body.get("reasoning_effort").is_none());
        assert_eq!(body.pointer("/extra_body/google/thinking_config/thinking_budget"), Some(&json!(0)));
    }
    #[test]
    fn recursive_overrides_can_remove_unsupported_fields() {
        let mut p = provider("custom");
        p.options.extra_body = serde_json::from_value(json!({"temperature": null, "stream_options": null, "chat_template_kwargs": {"enable_thinking": false}})).unwrap();
        p.options.max_tokens_field = Some("max_completion_tokens".into());
        let body = completion_body(&p, &[], true);
        assert!(body.get("temperature").is_none());
        assert!(body.get("stream_options").is_none());
        assert_eq!(body["max_completion_tokens"], json!(4096));
        assert_eq!(body.pointer("/chat_template_kwargs/enable_thinking"), Some(&json!(false)));
    }
}

#[cfg(test)]
mod embedding_reliability_tests {
    use super::*;
    #[test]
    fn explicit_dimensions_reach_native_and_compatible_embedding_requests() {
        let options = ProviderOptions { embedding_dimensions: Some(256), ..Default::default() };
        for mut body in [json!({"model":"native","input":["text"]}), json!({"model":"compatible","input":["text"],"encoding_format":"float"})] {
            embedding_options(&mut body, &options);
            assert_eq!(body["dimensions"], json!(256));
        }
    }
}
