use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{Provider, ProviderInput};
use crate::secure_storage;

pub(crate) fn validate_input(provider: &ProviderInput) -> CommandResult<()> {
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
    let secret = input_secret(provider, supplied)?;
    if requires_key(&provider.kind) && secret.is_none() {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_REQUIRED));
    }
    Ok(secret)
}

fn input_secret(provider: &ProviderInput, supplied: Option<&str>) -> CommandResult<Option<String>> {
    if let Some(secret) = supplied.map(str::trim).filter(|value| !value.is_empty()) {
        return Ok(Some(secret.to_owned()));
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
