use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{Provider, ProviderInput};
use crate::secure_storage;

pub(crate) fn validate_input(provider: &ProviderInput) -> CommandResult<()> {
    validate_options(&provider.options)?;
    if provider.name.trim().is_empty() {
        return Err(CommandError::new(keys::PROVIDER_NAME_REQUIRED));
    }
    if provider.model.trim().is_empty() {
        return Err(CommandError::new(keys::PROVIDER_MODEL_REQUIRED));
    }
    if !(0.0..=2.0).contains(&provider.temperature) {
        return Err(CommandError::new(keys::PROVIDER_TEMPERATURE_RANGE));
    }
    if !(0.0..=1.0).contains(&provider.top_p) {
        return Err(CommandError::new(keys::PROVIDER_TOP_P_RANGE));
    }
    if provider.max_tokens <= 0 {
        return Err(CommandError::new(keys::PROVIDER_MAX_TOKENS_POSITIVE));
    }
    if provider
        .embedding_model
        .as_deref()
        .is_some_and(|model| model.trim().is_empty())
    {
        return Err(CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_REQUIRED));
    }
    if provider
        .embedding_model
        .as_deref()
        .is_some_and(|model| model.chars().count() > 240)
    {
        return Err(CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_TOO_LONG));
    }
    if provider
        .embedding_base_url
        .as_deref()
        .is_some_and(|url| url.chars().count() > 2_000)
    {
        return Err(CommandError::new(keys::PROVIDER_BASE_URL_TOO_LONG));
    }
    if !is_known_kind(&provider.kind) {
        return Err(
            CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", &provider.kind)
        );
    }
    Ok(())
}

pub(crate) fn resolve_input_secret(
    provider: &ProviderInput,
    supplied: Option<&str>,
) -> CommandResult<Option<String>> {
    if provider.options.no_auth { return Ok(None); }
    let secret = input_secret(provider, supplied)?;
    if requires_key(&provider.kind) && secret.is_none() {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_REQUIRED));
    }
    Ok(secret)
}

fn input_secret(provider: &ProviderInput, supplied: Option<&str>) -> CommandResult<Option<String>> {
    if let Some(secret) = supplied {
        // None preserves stored keys; an explicitly supplied empty string clears them.
        return Ok(if secret.trim().is_empty() { None } else { Some(secret.trim().to_owned()) });
    }
    let Some(provider_id) = provider.id.as_deref() else {
        return Ok(None);
    };
    if requires_key(&provider.kind) {
        return secure_storage::read_provider_secret(provider_id);
    }
    Ok(secure_storage::read_provider_secret(provider_id).unwrap_or(None))
}

pub(crate) fn saved_secret(provider: &Provider) -> CommandResult<Option<String>> {
    if provider.options.no_auth { return Ok(None); }
    let secret = if requires_key(&provider.kind) {
        secure_storage::read_provider_secret(&provider.id)?
    } else {
        secure_storage::read_provider_secret(&provider.id).unwrap_or(None)
    };
    if requires_key(&provider.kind) && secret.is_none() {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_NOT_IN_STORAGE));
    }
    Ok(secret)
}

pub(crate) fn restore_secret(provider_id: &str, secret: Option<&str>) {
    match secret {
        Some(secret) => {
            let _ = secure_storage::save_provider_secret(provider_id, secret);
        }
        None => {
            let _ = secure_storage::delete_provider_secret(provider_id);
        }
    }
}

pub(crate) fn requires_key(kind: &str) -> bool {
    matches!(
        kind,
        "mistral"
            | "character-ai"
            | "cerebras"
            | "nvidia-nim"
            | "google-gemini"
            | "groq"
            | "openrouter"
            | "huggingface"
            | "ollama-cloud"
            | "cloudflare-workers-ai"
    )
}

pub(crate) fn is_known_kind(kind: &str) -> bool {
    matches!(
        kind,
        "mistral"
            | "character-ai"
            | "cerebras"
            | "nvidia-nim"
            | "google-gemini"
            | "groq"
            | "openrouter"
            | "huggingface"
            | "ollama"
            | "ollama-cloud"
            | "cloudflare-workers-ai"
            | "custom"
    )
}


pub(crate) fn validate_options(options: &crate::models::ProviderOptions) -> CommandResult<()> {
    let invalid = || CommandError::new(keys::PROVIDER_OPTIONS_INVALID);
    if options.thinking_level.as_deref().is_some_and(|s| !matches!(s, "minimal" | "low" | "medium" | "high"))
        || (options.thinking_level.is_some() && options.thinking_budget.is_some())
        || options.thinking_budget.is_some_and(|n| n < -1)
        || options.top_k.is_some_and(|n| n < 1)
        || options.embedding_dimensions.is_some_and(|n| n < 1)
        || options.frequency_penalty.is_some_and(|n| !n.is_finite() || !(-2.0..=2.0).contains(&n))
        || options.presence_penalty.is_some_and(|n| !n.is_finite() || !(-2.0..=2.0).contains(&n))
        || options.repetition_penalty.is_some_and(|n| !n.is_finite() || n <= 0.0)
        || options.stop.len() > 16 || options.stop.iter().any(|s| s.is_empty() || s.len() > 2_000)
        || options.reasoning_effort.as_deref().is_some_and(|s| !matches!(s, "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"))
        || options.max_tokens_field.as_deref().is_some_and(|s| !matches!(s, "max_tokens" | "max_completion_tokens" | "omit"))
        || options.embedding_format.as_deref().is_some_and(|s| !matches!(s, "auto" | "openai" | "ollama"))
    { return Err(invalid()); }
    for path in [&options.chat_path, &options.models_path].into_iter().flatten() {
        if path.trim().is_empty() || path.contains("://") || path.starts_with("//")
            || path.contains(['?', '#', '\\']) || path.split('/').any(|s| s == "..")
        { return Err(invalid()); }
    }
    let reserved = ["authorization", "proxy-authorization", "cookie", "set-cookie", "host", "content-length", "content-type", "connection", "x-api-key", "api-key", "x-goog-api-key"];
    if let Some(name) = &options.auth_header {
        reqwest::header::HeaderName::from_bytes(name.as_bytes()).map_err(|_| invalid())?;
        if matches!(name.to_ascii_lowercase().as_str(), "host" | "content-length" | "cookie" | "connection" | "content-type") { return Err(invalid()); }
    }
    if options.auth_prefix.as_deref().is_some_and(|s| s.contains(['\r', '\n'])) { return Err(invalid()); }
    for (name, value) in &options.headers {
        let lower = name.to_ascii_lowercase();
        if reserved.contains(&lower.as_str()) || options.auth_header.as_ref().is_some_and(|s| s.eq_ignore_ascii_case(name)) {
            return Err(invalid());
        }
        reqwest::header::HeaderName::from_bytes(name.as_bytes()).map_err(|_| invalid())?;
        reqwest::header::HeaderValue::from_str(value).map_err(|_| invalid())?;
    }
    // Request routing/content belongs to the application, not arbitrary JSON.
    for key in ["model", "messages", "stream", "input", "prompt"] {
        if options.extra_body.contains_key(key) || options.embedding_extra_body.contains_key(key) { return Err(invalid()); }
    }
    if serde_json::to_vec(options)?.len() > 64_000 { return Err(invalid()); }
    Ok(())
}

/// Embedding probes must not depend on a configured chat model or sampling defaults.
pub(crate) fn validate_embedding_input(provider: &ProviderInput) -> CommandResult<()> {
    validate_options(&provider.options)?;
    if !is_known_kind(&provider.kind) {
        return Err(CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", &provider.kind));
    }
    let model = provider.embedding_model.as_deref().map(str::trim)
        .filter(|s| !s.is_empty()).ok_or_else(|| CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_REQUIRED))?;
    if model.chars().count() > 240 { return Err(CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_TOO_LONG)); }
    if provider.embedding_base_url.as_deref().is_some_and(|url| url.chars().count() > 2_000) {
        return Err(CommandError::new(keys::PROVIDER_BASE_URL_TOO_LONG));
    }
    Ok(())
}

#[cfg(test)]
mod reliability_tests {
    use super::*;
    fn input(kind: &str) -> ProviderInput {
        serde_json::from_value(serde_json::json!({"name":"test","kind":kind,"model":"", "temperature":0.7,"topP":0.95,"maxTokens":1024,"options":{"noAuth":true}})).unwrap()
    }
    #[test]
    fn no_auth_never_requires_the_keyring() {
        let p = input("mistral");
        assert!(resolve_input_secret(&p, None).unwrap().is_none());
        let saved = p.into_provider("test".into(), "disabled".into(), None);
        assert!(saved_secret(&saved).unwrap().is_none());
    }
    #[test]
    fn explicit_empty_secret_does_not_reuse_stored_credentials() {
        let mut p = input("custom"); p.options.no_auth = false; p.id = Some("not-read-from-storage".into());
        assert!(resolve_input_secret(&p, Some("")).unwrap().is_none());
    }
    #[test]
    fn embedding_probe_does_not_require_a_chat_model() {
        let mut p = input("mistral"); p.embedding_model = Some("mistral-embed".into());
        validate_embedding_input(&p).unwrap();
        assert!(validate_input(&p).is_err());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(kind: &str) -> ProviderInput {
        ProviderInput {
            id: None,
            name: "Provider".into(),
            kind: kind.into(),
            model: "model".into(),
            base_url: None,
            account_id: None,
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 1024,
            embedding_model: None,
            embedding_base_url: None,
            options: Default::default(),
        }
    }

    #[test]
    fn local_ollama_does_not_require_a_secret_but_cloud_does() {
        assert!(!requires_key("ollama"));
        assert!(requires_key("ollama-cloud"));
    }

    #[test]
    fn provider_validation_rejects_unknown_kinds() {
        let error = validate_input(&input("unknown")).expect_err("reject unknown provider");
        assert_eq!(error.key, keys::PROVIDER_UNKNOWN_KIND);
        assert_eq!(
            error.variables.get("kind").map(String::as_str),
            Some("unknown")
        );
    }
}

