mod endpoints;
mod retry;

use std::time::Instant;

use reqwest::{Client, RequestBuilder};
use serde_json::{json, Value};

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    CompletionResult, EmbeddingResult, Message, Provider, ProviderInput, ProviderModelResult,
    RetrySettings,
};
use endpoints::{
    embedding_endpoint_saved, ollama_base, ollama_base_saved, openai_base, openai_base_saved,
    required_text, uses_ollama_embedding_api, validate_provider, validate_saved_provider,
};
use retry::{provider_pool_id_input, send_with_retry, JsonResponse};

#[cfg(test)]
use retry::{
    block_api_key, exponential_delay, first_available_key, is_empty_json, is_retryable_status,
    parse_api_keys, parse_rate_limit_delay, rate_limit_state_from_headers,
};

pub async fn list_models(
    provider: &ProviderInput,
    api_key: Option<&str>,
    retry: &RetrySettings,
) -> CommandResult<ProviderModelResult> {
    validate_provider(provider, api_key)?;
    let client = http_client()?;
    let started = Instant::now();
    let pool_id = provider_pool_id_input(provider);

    let response = match provider.kind.as_str() {
        "ollama" | "ollama-cloud" => {
            let url = format!("{}/tags", ollama_base(provider));
            send_with_retry(
                &pool_id,
                api_key,
                |selected_key| authenticated(client.get(&url), selected_key),
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
                &pool_id,
                api_key,
                |selected_key| authenticated(client.get(&url), selected_key),
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
                &pool_id,
                api_key,
                |selected_key| authenticated(client.get(&url), selected_key),
                retry,
                keys::PROVIDER_CONNECTION_FAILED,
            )
            .await
        }
    }?;

    let value = response_json(response)?;
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
        .chain(user_content.map(|content| json!({ "role": "user", "content": content })))
        .collect::<Vec<_>>();
    let started = Instant::now();
    let pool_id = provider.id.clone();

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
                &pool_id,
                api_key,
                |selected_key| authenticated(client.post(&url), selected_key).json(&body),
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
                &pool_id,
                api_key,
                |selected_key| authenticated(client.post(&url), selected_key).json(&body),
                retry,
                keys::PROVIDER_REQUEST_FAILED,
            )
            .await
        }
    }?;

    let value = response_json(response)?;
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
            output_tokens: value.get("eval_count").and_then(Value::as_i64).unwrap_or(0),
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
    let pool_id = provider.id.clone();
    let embedding_url = embedding_endpoint_saved(provider)?;
    let uses_ollama_api = uses_ollama_embedding_api(provider, &embedding_url);
    let response = if uses_ollama_api {
        let legacy_endpoint = embedding_url
            .trim_end_matches('/')
            .to_ascii_lowercase()
            .ends_with("/api/embeddings");
        let body = if legacy_endpoint && inputs.len() == 1 {
            json!({ "model": model, "prompt": inputs[0].as_str() })
        } else {
            json!({ "model": model, "input": inputs })
        };
        send_with_retry(
            &pool_id,
            api_key,
            |selected_key| authenticated(client.post(&embedding_url), selected_key).json(&body),
            retry,
            keys::PROVIDER_REQUEST_FAILED,
        )
        .await?
    } else {
        let body = json!({ "model": model, "input": inputs, "encoding_format": "float" });
        send_with_retry(
            &pool_id,
            api_key,
            |selected_key| authenticated(client.post(&embedding_url), selected_key).json(&body),
            retry,
            keys::PROVIDER_REQUEST_FAILED,
        )
        .await?
    };

    let value = response_json(response)?;
    let embeddings = parse_embedding_response(&value)?;

    if embeddings.len() != inputs.len() || embeddings.iter().any(Vec::is_empty) {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }
    let dimensions = embeddings[0].len();
    if embeddings
        .iter()
        .any(|embedding| embedding.len() != dimensions)
    {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }

    Ok(EmbeddingResult {
        embeddings,
        latency_ms: started.elapsed().as_millis().min(i64::MAX as u128) as i64,
    })
}

fn parse_embedding_response(value: &Value) -> CommandResult<Vec<Vec<f32>>> {
    if let Some(raw_embeddings) = value.get("embeddings") {
        let values = raw_embeddings
            .as_array()
            .ok_or_else(|| CommandError::new(keys::PROVIDER_EMPTY_RESPONSE))?;
        if values.first().is_some_and(|item| item.is_array()) {
            return values.iter().map(parse_embedding).collect();
        }
        return Ok(vec![parse_embedding(raw_embeddings)?]);
    }

    if let Some(raw_embedding) = value.get("embedding") {
        return Ok(vec![parse_embedding(raw_embedding)?]);
    }

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
    if indexed.is_empty() {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }
    Ok(indexed.into_iter().map(|(_, vector)| vector).collect())
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

fn response_json(response: JsonResponse) -> CommandResult<Value> {
    let JsonResponse { status, value } = response;

    if (200..300).contains(&status) {
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
        .unwrap_or("-");
    Err(CommandError::new(keys::PROVIDER_HTTP_ERROR)
        .with_variable("status", status)
        .with_variable("detail", detail))
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
#[path = "provider_client_tests.rs"]
mod tests;
