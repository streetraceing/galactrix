use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{Provider, ProviderInput};
use crate::provider_support;

const DEFAULT_MISTRAL_URL: &str = "https://api.mistral.ai/v1";
const DEFAULT_CEREBRAS_URL: &str = "https://api.cerebras.ai/v1";
const DEFAULT_NVIDIA_URL: &str = "https://integrate.api.nvidia.com/v1";
const DEFAULT_GEMINI_URL: &str = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_GROQ_URL: &str = "https://api.groq.com/openai/v1";
const DEFAULT_OPENROUTER_URL: &str = "https://openrouter.ai/api/v1";
const DEFAULT_HUGGINGFACE_URL: &str = "https://router.huggingface.co/v1";
const DEFAULT_OLLAMA_LOCAL_URL: &str = "http://localhost:11434/api";
const DEFAULT_OLLAMA_CLOUD_URL: &str = "https://ollama.com/api";

pub(super) fn validate_provider(
    provider: &ProviderInput,
    api_key: Option<&str>,
) -> CommandResult<()> {
    if provider.name.trim().is_empty() {
        return Err(CommandError::new(keys::PROVIDER_NAME_REQUIRED));
    }
    provider_support::validate_options(&provider.options)?;
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, provider.id.is_some(), provider.options.no_auth)?;
    if provider.kind == "custom" {
        required_text(
            provider.base_url.as_deref(),
            keys::PROVIDER_BASE_URL_REQUIRED,
        )?;
    }
    if provider.kind == "cloudflare-workers-ai" && provider.base_url.as_deref().map(str::trim).filter(|v| !v.is_empty()).is_none() {
        required_text(
            provider.account_id.as_deref(),
            keys::PROVIDER_ACCOUNT_ID_REQUIRED,
        )?;
    }
    Ok(())
}

pub(super) fn validate_saved_provider(
    provider: &Provider,
    api_key: Option<&str>,
) -> CommandResult<()> {
    provider_support::validate_options(&provider.options)?;
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, false, provider.options.no_auth)?;
    if provider.model.trim().is_empty() {
        return Err(CommandError::new(keys::PROVIDER_MODEL_REQUIRED));
    }
    Ok(())
}

fn validate_supported_kind(kind: &str) -> CommandResult<()> {
    if kind == "character-ai" {
        return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
    }
    Ok(())
}

fn validate_kind(kind: &str) -> CommandResult<()> {
    if provider_support::is_known_kind(kind) {
        Ok(())
    } else {
        Err(CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", kind))
    }
}

fn validate_auth(kind: &str, api_key: Option<&str>, existing_id: bool, no_auth: bool) -> CommandResult<()> {
    if !no_auth && provider_support::requires_key(kind)
        && !existing_id
        && api_key
            .map(str::trim)
            .filter(|key| !key.is_empty())
            .is_none()
    {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_REQUIRED));
    }
    Ok(())
}

pub(super) fn openai_base(provider: &ProviderInput) -> CommandResult<String> {
    let base = match provider.kind.as_str() {
        "mistral" => provider.base_url.as_deref().unwrap_or(DEFAULT_MISTRAL_URL),
        "cerebras" => provider.base_url.as_deref().unwrap_or(DEFAULT_CEREBRAS_URL),
        "nvidia-nim" => provider.base_url.as_deref().unwrap_or(DEFAULT_NVIDIA_URL),
        "google-gemini" => provider.base_url.as_deref().unwrap_or(DEFAULT_GEMINI_URL),
        "groq" => provider.base_url.as_deref().unwrap_or(DEFAULT_GROQ_URL),
        "openrouter" => provider
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_OPENROUTER_URL),
        "huggingface" => provider
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_HUGGINGFACE_URL),
        "cloudflare-workers-ai" => {
            if let Some(base) = provider.base_url.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
                return Ok(base.trim_end_matches('/').to_owned());
            }
            let account_id = required_text(
                provider.account_id.as_deref(),
                keys::PROVIDER_ACCOUNT_ID_REQUIRED,
            )?;
            return Ok(format!(
                "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1"
            ));
        }
        "custom" => required_text(
            provider.base_url.as_deref(),
            keys::PROVIDER_BASE_URL_REQUIRED,
        )?,
        _ => return Err(CommandError::new(keys::PROVIDER_NOT_OPENAI_COMPATIBLE)),
    };
    Ok(base.trim_end_matches('/').to_owned())
}

pub(super) fn embedding_endpoint_saved(provider: &Provider) -> CommandResult<String> {
    if let Some(endpoint) = provider
        .embedding_base_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(endpoint.to_owned());
    }

    if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        Ok(format!("{}/embed", ollama_base_saved(provider)))
    } else {
        Ok(format!("{}/embeddings", openai_base_saved(provider)?))
    }
}

pub(super) fn openai_base_saved(provider: &Provider) -> CommandResult<String> {
    openai_base(&ProviderInput::from(provider))
}

pub(super) fn ollama_base(provider: &ProviderInput) -> String {
    let default = if provider.kind == "ollama-cloud" {
        DEFAULT_OLLAMA_CLOUD_URL
    } else {
        DEFAULT_OLLAMA_LOCAL_URL
    };
    normalize_ollama_base(provider.base_url.as_deref().unwrap_or(default))
}

pub(super) fn ollama_base_saved(provider: &Provider) -> String {
    let default = if provider.kind == "ollama-cloud" {
        DEFAULT_OLLAMA_CLOUD_URL
    } else {
        DEFAULT_OLLAMA_LOCAL_URL
    };
    normalize_ollama_base(provider.base_url.as_deref().unwrap_or(default))
}

fn normalize_ollama_base(base: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with("/api") {
        base.to_owned()
    } else {
        format!("{base}/api")
    }
}

pub(super) fn required_text<'a>(
    value: Option<&'a str>,
    error_key: &'static str,
) -> CommandResult<&'a str> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::new(error_key))
}

pub(super) fn uses_ollama_embedding_api(provider: &Provider, endpoint: &str) -> bool {
    match provider.options.embedding_format.as_deref() {
        Some("openai") => return false,
        Some("ollama") => return true,
        _ => {}
    }
    // An explicit remote endpoint must not inherit the chat provider protocol.
    if provider.embedding_base_url.is_none() && matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        return true;
    }

    let path = endpoint.split(['?', '#']).next().unwrap_or(endpoint);
    let normalized = path.trim_end_matches('/').to_ascii_lowercase();
    normalized.ends_with("/api/embed") || normalized.ends_with("/api/embeddings")
}


pub(super) fn operation_url(base: &str, path: Option<&str>, default: &str) -> String {
    format!("{}/{}", base.trim_end_matches('/'), path.unwrap_or(default).trim_start_matches('/'))
}

/// Route model listing through the same configured service as chat requests.
pub(super) fn models_endpoint(provider: &ProviderInput) -> CommandResult<String> {
    if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        return Ok(operation_url(&ollama_base(provider), provider.options.models_path.as_deref(), "tags"));
    }
    let custom_base = provider.base_url.as_deref().map(str::trim).filter(|s| !s.is_empty());
    if provider.kind == "cloudflare-workers-ai" && custom_base.is_none() && provider.options.models_path.is_none() {
        let account = required_text(provider.account_id.as_deref(), keys::PROVIDER_ACCOUNT_ID_REQUIRED)?;
        return Ok(format!("https://api.cloudflare.com/client/v4/accounts/{account}/ai/models/search?per_page=1000"));
    }
    Ok(operation_url(&openai_base(provider)?, provider.options.models_path.as_deref(), "models"))
}

#[cfg(test)]
mod reliability_tests {
    use super::*;
    fn input(kind: &str) -> ProviderInput {
        serde_json::from_value(serde_json::json!({"name":"test","kind":kind,"model":"chat", "temperature":0.7,"topP":0.95,"maxTokens":1024})).unwrap()
    }
    #[test]
    fn model_paths_are_respected_for_ollama_and_cloudflare_gateways() {
        let mut p = input("ollama"); p.base_url = Some("http://localhost:11434/api".into());
        p.options.models_path = Some("custom-tags".into());
        assert_eq!(models_endpoint(&p).unwrap(), "http://localhost:11434/api/custom-tags");
        let mut p = input("cloudflare-workers-ai");
        p.base_url = Some("https://gateway.example/v1".into()); p.options.no_auth = true;
        validate_provider(&p, None).unwrap();
        assert_eq!(models_endpoint(&p).unwrap(), "https://gateway.example/v1/models");
        p.options.models_path = Some("catalog".into());
        assert_eq!(models_endpoint(&p).unwrap(), "https://gateway.example/v1/catalog");
    }
}
