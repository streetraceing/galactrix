use std::time::{Duration, Instant};

use reqwest::{Client, RequestBuilder, Response};
use serde_json::{json, Value};

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    CompletionResult, EmbeddingResult, Message, Provider, ProviderInput, ProviderModelResult,
    RetrySettings,
};

const DEFAULT_MISTRAL_URL: &str = "https://api.mistral.ai/v1";
const DEFAULT_CEREBRAS_URL: &str = "https://api.cerebras.ai/v1";
const DEFAULT_NVIDIA_URL: &str = "https://integrate.api.nvidia.com/v1";
const DEFAULT_GEMINI_URL: &str = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_GROQ_URL: &str = "https://api.groq.com/openai/v1";
const DEFAULT_OPENROUTER_URL: &str = "https://openrouter.ai/api/v1";
const DEFAULT_HUGGINGFACE_URL: &str = "https://router.huggingface.co/v1";
const DEFAULT_OLLAMA_LOCAL_URL: &str = "http://localhost:11434/api";
const DEFAULT_OLLAMA_CLOUD_URL: &str = "https://ollama.com/api";

pub async fn list_models(
    provider: &ProviderInput,
    api_key: Option<&str>,
    retry: &RetrySettings,
) -> CommandResult<ProviderModelResult> {
    validate_provider(provider, api_key)?;
    let client = http_client()?;
    let started = Instant::now();

    let response = match provider.kind.as_str() {
        "ollama" | "ollama-cloud" => {
            let url = format!("{}/tags", ollama_base(provider));
            send_with_retry(
                || authenticated(client.get(&url), api_key),
                retry,
                keys::PROVIDER_CONNECTION_FAILED,
            )
            .await
        }
        "cloudflare-workers-ai" => {
            let account_id = required_text(
                provider.account_id.as_deref(),
                keys::PROVIDER_ACCOUNT_ID_REQUIRED,
            )?;
            let url = format!(
                "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models/search?per_page=1000"
            );
            send_with_retry(
                || authenticated(client.get(&url), api_key),
                retry,
                keys::PROVIDER_CONNECTION_FAILED,
            )
            .await
        }
        "character-ai" => {
            return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
        }
        _ => {
            let url = format!("{}/models", openai_base(provider)?);
            send_with_retry(
                || authenticated(client.get(&url), api_key),
                retry,
                keys::PROVIDER_CONNECTION_FAILED,
            )
            .await
        }
    }?;

    let value = response_json(response).await?;
    let mut models = match provider.kind.as_str() {
        "ollama" | "ollama-cloud" => value
            .get("models")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|item| {
                item.get("model")
                    .or_else(|| item.get("name"))
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            })
            .collect::<Vec<_>>(),
        "cloudflare-workers-ai" => value
            .get("result")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|item| {
                item.get("name")
                    .or_else(|| item.get("id"))
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            })
            .collect::<Vec<_>>(),
        _ => value
            .get("data")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|item| {
                item.get("id")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
                    .or_else(|| item.as_str().map(str::to_owned))
            })
            .collect::<Vec<_>>(),
    };

    models.sort_unstable();
    models.dedup();

    Ok(ProviderModelResult {
        models,
        latency_ms: started.elapsed().as_millis().min(i64::MAX as u128) as i64,
    })
}

pub async fn complete(
    provider: &Provider,
    api_key: Option<&str>,
    history: &[Message],
    system_prompt: Option<&str>,
    user_content: Option<&str>,
    retry: &RetrySettings,
) -> CommandResult<CompletionResult> {
    validate_saved_provider(provider, api_key)?;
    let client = http_client()?;
    let messages = system_prompt
        .map(|content| json!({ "role": "system", "content": content }))
        .into_iter()
        .chain(
            history
                .iter()
                .filter(|message| matches!(message.role.as_str(), "system" | "user" | "assistant"))
                .map(|message| json!({ "role": message.role, "content": message.content })),
        )
        .chain(
            user_content
                .map(|content| json!({ "role": "user", "content": content }))
                .into_iter(),
        )
        .collect::<Vec<_>>();
    let started = Instant::now();

    let response = match provider.kind.as_str() {
        "ollama" | "ollama-cloud" => {
            let url = format!("{}/chat", ollama_base_saved(provider));
            let body = json!({
                "model": provider.model,
                "messages": messages,
                "stream": false,
                "options": {
                    "temperature": provider.temperature,
                    "top_p": provider.top_p,
                    "num_predict": provider.max_tokens,
                }
            });
            send_with_retry(
                || authenticated(client.post(&url), api_key).json(&body),
                retry,
                keys::PROVIDER_REQUEST_FAILED,
            )
            .await
        }
        "character-ai" => {
            return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
        }
        _ => {
            let url = format!("{}/chat/completions", openai_base_saved(provider)?);
            let body = json!({
                "model": provider.model,
                "messages": messages,
                "temperature": provider.temperature,
                "top_p": provider.top_p,
                "max_tokens": provider.max_tokens,
                "stream": false,
            });
            send_with_retry(
                || authenticated(client.post(&url), api_key).json(&body),
                retry,
                keys::PROVIDER_REQUEST_FAILED,
            )
            .await
        }
    }?;

    let value = response_json(response).await?;
    let latency_ms = started.elapsed().as_millis().min(i64::MAX as u128) as i64;

    if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        let content = value
            .pointer("/message/content")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|content| !content.is_empty())
            .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?
            .to_owned();
        return Ok(CompletionResult {
            content,
            input_tokens: value
                .get("prompt_eval_count")
                .and_then(Value::as_i64)
                .unwrap_or(0),
            output_tokens: value
                .get("eval_count")
                .and_then(Value::as_i64)
                .unwrap_or(0),
            latency_ms,
        });
    }

    let content_value = value
        .pointer("/choices/0/message/content")
        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?;
    let extracted = extract_text(content_value);
    let content = extracted
        .as_deref()
        .map(str::trim)
        .filter(|content| !content.is_empty())
        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?
        .to_owned();

    Ok(CompletionResult {
        content,
        input_tokens: value
            .pointer("/usage/prompt_tokens")
            .and_then(Value::as_i64)
            .unwrap_or(0),
        output_tokens: value
            .pointer("/usage/completion_tokens")
            .and_then(Value::as_i64)
            .unwrap_or(0),
        latency_ms,
    })
}

pub async fn embed(
    provider: &Provider,
    api_key: Option<&str>,
    inputs: &[String],
    retry: &RetrySettings,
) -> CommandResult<EmbeddingResult> {
    validate_saved_provider(provider, api_key)?;
    let model = provider
        .embedding_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_REQUIRED))?;
    if inputs.is_empty() {
        return Ok(EmbeddingResult {
            embeddings: Vec::new(),
            latency_ms: 0,
        });
    }

    let client = http_client()?;
    let started = Instant::now();
    let embedding_url = embedding_endpoint_saved(provider)?;
    let response = if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        let body = json!({ "model": model, "input": inputs });
        send_with_retry(
            || authenticated(client.post(&embedding_url), api_key).json(&body),
            retry,
            keys::PROVIDER_REQUEST_FAILED,
        )
        .await?
    } else {
        let body = json!({ "model": model, "input": inputs, "encoding_format": "float" });
        send_with_retry(
            || authenticated(client.post(&embedding_url), api_key).json(&body),
            retry,
            keys::PROVIDER_REQUEST_FAILED,
        )
        .await?
    };

    let value = response_json(response).await?;
    let embeddings = if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        value
            .get("embeddings")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .map(parse_embedding)
            .collect::<CommandResult<Vec<_>>>()?
    } else {
        let mut indexed = value
            .get("data")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .map(|item| {
                let index = item.get("index").and_then(Value::as_u64).unwrap_or(0) as usize;
                let vector = parse_embedding(
                    item.get("embedding")
                        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?,
                )?;
                Ok((index, vector))
            })
            .collect::<CommandResult<Vec<_>>>()?;
        indexed.sort_by_key(|(index, _)| *index);
        indexed.into_iter().map(|(_, vector)| vector).collect()
    };

    if embeddings.len() != inputs.len() || embeddings.iter().any(Vec::is_empty) {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }
    let dimensions = embeddings[0].len();
    if embeddings.iter().any(|embedding| embedding.len() != dimensions) {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }

    Ok(EmbeddingResult {
        embeddings,
        latency_ms: started.elapsed().as_millis().min(i64::MAX as u128) as i64,
    })
}

async fn send_with_retry<F>(
    mut build_request: F,
    settings: &RetrySettings,
    error_key: &'static str,
) -> CommandResult<Response>
where
    F: FnMut() -> RequestBuilder,
{
    let attempts = if settings.enabled {
        settings.max_attempts.clamp(1, 8)
    } else {
        1
    };
    let initial_delay = settings.initial_delay_ms.clamp(100, 60_000);
    let max_delay = settings.max_delay_ms.clamp(initial_delay, 300_000);

    for attempt in 1..=attempts {
        match build_request().send().await {
            Ok(response) => {
                if attempt < attempts && is_retryable_status(response.status().as_u16()) {
                    let delay = retry_after_delay(&response)
                        .unwrap_or_else(|| exponential_delay(initial_delay, max_delay, attempt));
                    tokio::time::sleep(delay).await;
                    continue;
                }
                return Ok(response);
            }
            Err(error) => {
                if attempt >= attempts || !is_retryable_request_error(&error) {
                    return Err(CommandError::with_detail(error_key, error));
                }
                tokio::time::sleep(exponential_delay(initial_delay, max_delay, attempt)).await;
            }
        }
    }

    Err(CommandError::new(error_key))
}

fn exponential_delay(initial_ms: u64, max_ms: u64, failed_attempt: u32) -> Duration {
    let multiplier = 1_u64
        .checked_shl(failed_attempt.saturating_sub(1).min(20))
        .unwrap_or(u64::MAX);
    Duration::from_millis(initial_ms.saturating_mul(multiplier).min(max_ms))
}

fn retry_after_delay(response: &Response) -> Option<Duration> {
    let seconds = response
        .headers()
        .get(reqwest::header::RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse::<u64>()
        .ok()?;
    Some(Duration::from_secs(seconds.min(300)))
}

fn is_retryable_status(status: u16) -> bool {
    matches!(status, 408 | 409 | 425 | 429 | 500..=599)
}

fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect() || error.is_request() || error.is_body()
}

fn parse_embedding(value: &Value) -> CommandResult<Vec<f32>> {
    value
        .as_array()
        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?
        .iter()
        .map(|number| {
            number
                .as_f64()
                .filter(|value| value.is_finite())
                .map(|value| value as f32)
                .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))
        })
        .collect()
}

fn http_client() -> CommandResult<Client> {
    Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(180))
        .user_agent("Galactrix/1.0")
        .build()
        .map_err(CommandError::internal)
}

fn authenticated(request: RequestBuilder, api_key: Option<&str>) -> RequestBuilder {
    match api_key.map(str::trim).filter(|key| !key.is_empty()) {
        Some(key) => request.bearer_auth(key),
        None => request,
    }
}

async fn response_json(response: Response) -> CommandResult<Value> {
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| CommandError::with_detail(keys::PROVIDER_RESPONSE_READ_FAILED, error))?;
    let value = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| json!({ "raw": text }));

    if status.is_success() {
        return Ok(value);
    }

    let detail = value
        .pointer("/error/message")
        .or_else(|| value.get("error"))
        .or_else(|| value.get("message"))
        .and_then(Value::as_str)
        .or_else(|| value.get("raw").and_then(Value::as_str))
        .map(str::trim)
        .filter(|message| !message.is_empty())
        .unwrap_or("—");
    Err(CommandError::new(keys::PROVIDER_HTTP_ERROR)
        .with_variable("status", status.as_u16())
        .with_variable("detail", detail))
}

fn validate_provider(provider: &ProviderInput, api_key: Option<&str>) -> CommandResult<()> {
    if provider.name.trim().is_empty() {
        return Err(CommandError::new(keys::PROVIDER_NAME_REQUIRED));
    }
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, provider.id.is_some())?;
    if provider.kind == "custom" {
        required_text(provider.base_url.as_deref(), keys::PROVIDER_BASE_URL_REQUIRED)?;
    }
    if provider.kind == "cloudflare-workers-ai" {
        required_text(
            provider.account_id.as_deref(),
            keys::PROVIDER_ACCOUNT_ID_REQUIRED,
        )?;
    }
    Ok(())
}

fn validate_saved_provider(provider: &Provider, api_key: Option<&str>) -> CommandResult<()> {
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, false)?;
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
    match kind {
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
        | "custom" => Ok(()),
        _ => Err(CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", kind)),
    }
}

fn validate_auth(kind: &str, api_key: Option<&str>, existing_id: bool) -> CommandResult<()> {
    let requires_key = matches!(
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
    );
    if requires_key
        && !existing_id
        && api_key.map(str::trim).filter(|key| !key.is_empty()).is_none()
    {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_REQUIRED));
    }
    Ok(())
}

fn openai_base(provider: &ProviderInput) -> CommandResult<String> {
    let base = match provider.kind.as_str() {
        "mistral" => provider.base_url.as_deref().unwrap_or(DEFAULT_MISTRAL_URL),
        "cerebras" => provider.base_url.as_deref().unwrap_or(DEFAULT_CEREBRAS_URL),
        "nvidia-nim" => provider.base_url.as_deref().unwrap_or(DEFAULT_NVIDIA_URL),
        "google-gemini" => provider.base_url.as_deref().unwrap_or(DEFAULT_GEMINI_URL),
        "groq" => provider.base_url.as_deref().unwrap_or(DEFAULT_GROQ_URL),
        "openrouter" => provider.base_url.as_deref().unwrap_or(DEFAULT_OPENROUTER_URL),
        "huggingface" => provider
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_HUGGINGFACE_URL),
        "cloudflare-workers-ai" => {
            let account_id = required_text(
                provider.account_id.as_deref(),
                keys::PROVIDER_ACCOUNT_ID_REQUIRED,
            )?;
            return Ok(format!(
                "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1"
            ));
        }
        "custom" => required_text(provider.base_url.as_deref(), keys::PROVIDER_BASE_URL_REQUIRED)?,
        _ => return Err(CommandError::new(keys::PROVIDER_NOT_OPENAI_COMPATIBLE)),
    };
    Ok(base.trim_end_matches('/').to_owned())
}

fn embedding_endpoint_saved(provider: &Provider) -> CommandResult<String> {
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

fn openai_base_saved(provider: &Provider) -> CommandResult<String> {
    let input = ProviderInput {
        id: Some(provider.id.clone()),
        name: provider.name.clone(),
        kind: provider.kind.clone(),
        model: provider.model.clone(),
        base_url: provider.base_url.clone(),
        account_id: provider.account_id.clone(),
        temperature: provider.temperature,
        top_p: provider.top_p,
        max_tokens: provider.max_tokens,
        embedding_model: provider.embedding_model.clone(),
        embedding_base_url: provider.embedding_base_url.clone(),
    };
    openai_base(&input)
}

fn ollama_base(provider: &ProviderInput) -> String {
    let default = if provider.kind == "ollama-cloud" {
        DEFAULT_OLLAMA_CLOUD_URL
    } else {
        DEFAULT_OLLAMA_LOCAL_URL
    };
    normalize_ollama_base(provider.base_url.as_deref().unwrap_or(default))
}

fn ollama_base_saved(provider: &Provider) -> String {
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

fn required_text<'a>(value: Option<&'a str>, error_key: &'static str) -> CommandResult<&'a str> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::new(error_key))
}

fn extract_text(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return Some(text.to_owned());
    }
    let parts = value.as_array()?;
    let text = parts
        .iter()
        .filter_map(|part| {
            part.get("text")
                .and_then(Value::as_str)
                .or_else(|| part.pointer("/text/value").and_then(Value::as_str))
        })
        .collect::<Vec<_>>()
        .join("");
    (!text.is_empty()).then_some(text)
}

#[cfg(test)]
#[path = "../../test/rust/provider_client.rs"]
mod tests;
