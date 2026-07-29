use std::time::Instant;

use reqwest::{Client, RequestBuilder, Response};
use serde_json::{json, Value};

use crate::models::{CompletionResult, Message, Provider, ProviderInput, ProviderModelResult};

const DEFAULT_MISTRAL_URL: &str = "https://api.mistral.ai/v1";
const DEFAULT_CEREBRAS_URL: &str = "https://api.cerebras.ai/v1";
const DEFAULT_NVIDIA_URL: &str = "https://integrate.api.nvidia.com/v1";
const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434/api";

pub async fn list_models(
    provider: &ProviderInput,
    api_key: Option<&str>,
) -> Result<ProviderModelResult, String> {
    validate_provider(provider, api_key)?;
    let client = http_client()?;
    let started = Instant::now();

    let response = match provider.kind.as_str() {
        "ollama-cloud" => {
            let url = format!("{}/tags", ollama_base(provider));
            authenticated(client.get(url), api_key).send().await
        }
        "cloudflare-workers-ai" => {
            let account_id = required_text(provider.account_id.as_deref(), "Cloudflare Account ID")?;
            let url = format!(
                "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models/search?per_page=1000"
            );
            authenticated(client.get(url), api_key).send().await
        }
        "character-ai" => {
            return Err(
                "Character.AI не предоставляет совместимый публичный API; нужен отдельный адаптер"
                    .into(),
            );
        }
        _ => {
            let url = format!("{}/models", openai_base(provider)?);
            authenticated(client.get(url), api_key).send().await
        }
    }
    .map_err(|error| format!("Не удалось подключиться к API: {error}"))?;

    let value = response_json(response).await?;
    let mut models = match provider.kind.as_str() {
        "ollama-cloud" => value
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
) -> Result<CompletionResult, String> {
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
        "ollama-cloud" => {
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
            authenticated(client.post(url), api_key).json(&body).send().await
        }
        "character-ai" => {
            return Err(
                "Для Character.AI ещё не реализован отдельный адаптер авторизации".into(),
            );
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
            authenticated(client.post(url), api_key).json(&body).send().await
        }
    }
    .map_err(|error| format!("Запрос к модели не выполнен: {error}"))?;

    let value = response_json(response).await?;
    let latency_ms = started.elapsed().as_millis().min(i64::MAX as u128) as i64;

    if provider.kind == "ollama-cloud" {
        let content = value
            .pointer("/message/content")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|content| !content.is_empty())
            .ok_or_else(|| "Ollama вернул ответ без текста".to_string())?
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
        .ok_or_else(|| "Провайдер вернул ответ без choices[0].message.content".to_string())?;
    let extracted = extract_text(content_value);
    let content = extracted
        .as_deref()
        .map(str::trim)
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "Провайдер вернул пустой текст".to_string())?
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

fn http_client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(180))
        .user_agent("Galactrix/0.1")
        .build()
        .map_err(|error| error.to_string())
}

fn authenticated(request: RequestBuilder, api_key: Option<&str>) -> RequestBuilder {
    match api_key.map(str::trim).filter(|key| !key.is_empty()) {
        Some(key) => request.bearer_auth(key),
        None => request,
    }
}

async fn response_json(response: Response) -> Result<Value, String> {
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Не удалось прочитать ответ API: {error}"))?;
    let value = serde_json::from_str::<Value>(&text).unwrap_or_else(|_| json!({ "raw": text }));

    if status.is_success() {
        return Ok(value);
    }

    let message = value
        .pointer("/error/message")
        .or_else(|| value.get("error"))
        .or_else(|| value.get("message"))
        .and_then(Value::as_str)
        .or_else(|| value.get("raw").and_then(Value::as_str))
        .unwrap_or("API вернул ошибку");
    Err(format!("HTTP {}: {message}", status.as_u16()))
}

fn validate_provider(provider: &ProviderInput, api_key: Option<&str>) -> Result<(), String> {
    if provider.name.trim().is_empty() {
        return Err("Укажите название подключения".into());
    }
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, provider.id.is_some())?;
    if provider.kind == "custom" {
        required_text(provider.base_url.as_deref(), "Base URL")?;
    }
    if provider.kind == "cloudflare-workers-ai" {
        required_text(provider.account_id.as_deref(), "Cloudflare Account ID")?;
    }
    Ok(())
}

fn validate_saved_provider(provider: &Provider, api_key: Option<&str>) -> Result<(), String> {
    validate_kind(&provider.kind)?;
    validate_supported_kind(&provider.kind)?;
    validate_auth(&provider.kind, api_key, false)?;
    if provider.model.trim().is_empty() {
        return Err("У подключения не выбрана модель".into());
    }
    Ok(())
}

fn validate_supported_kind(kind: &str) -> Result<(), String> {
    if kind == "character-ai" {
        return Err(
            "Для Character.AI ещё не реализован отдельный адаптер авторизации".into(),
        );
    }
    Ok(())
}

fn validate_kind(kind: &str) -> Result<(), String> {
    match kind {
        "mistral"
        | "character-ai"
        | "cerebras"
        | "nvidia-nim"
        | "ollama-cloud"
        | "cloudflare-workers-ai"
        | "custom" => Ok(()),
        _ => Err(format!("Неизвестный тип провайдера: {kind}")),
    }
}

fn validate_auth(kind: &str, api_key: Option<&str>, existing_id: bool) -> Result<(), String> {
    let requires_key = matches!(
        kind,
        "mistral" | "character-ai" | "cerebras" | "nvidia-nim" | "cloudflare-workers-ai"
    );
    if requires_key
        && !existing_id
        && api_key.map(str::trim).filter(|key| !key.is_empty()).is_none()
    {
        return Err("Для этого провайдера нужен API-ключ".into());
    }
    Ok(())
}

fn openai_base(provider: &ProviderInput) -> Result<String, String> {
    let base = match provider.kind.as_str() {
        "mistral" => provider.base_url.as_deref().unwrap_or(DEFAULT_MISTRAL_URL),
        "cerebras" => provider.base_url.as_deref().unwrap_or(DEFAULT_CEREBRAS_URL),
        "nvidia-nim" => provider.base_url.as_deref().unwrap_or(DEFAULT_NVIDIA_URL),
        "cloudflare-workers-ai" => {
            let account_id = required_text(provider.account_id.as_deref(), "Cloudflare Account ID")?;
            return Ok(format!(
                "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1"
            ));
        }
        "custom" => required_text(provider.base_url.as_deref(), "Base URL")?,
        _ => return Err("Провайдер не использует OpenAI-compatible API".into()),
    };
    Ok(base.trim_end_matches('/').to_owned())
}

fn openai_base_saved(provider: &Provider) -> Result<String, String> {
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
    };
    openai_base(&input)
}

fn ollama_base(provider: &ProviderInput) -> String {
    normalize_ollama_base(provider.base_url.as_deref().unwrap_or(DEFAULT_OLLAMA_URL))
}

fn ollama_base_saved(provider: &Provider) -> String {
    normalize_ollama_base(provider.base_url.as_deref().unwrap_or(DEFAULT_OLLAMA_URL))
}

fn normalize_ollama_base(base: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with("/api") {
        base.to_owned()
    } else {
        format!("{base}/api")
    }
}

fn required_text<'a>(value: Option<&'a str>, label: &str) -> Result<&'a str, String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("Укажите {label}"))
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
