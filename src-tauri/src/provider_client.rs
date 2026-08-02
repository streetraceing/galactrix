use std::collections::{hash_map::DefaultHasher, HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use reqwest::{header::HeaderMap, Client, RequestBuilder, Response};
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

    let value = response_json(response).await?;
    let embeddings = parse_embedding_response(&value)?;

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

#[derive(Default)]
struct ApiKeyPoolState {
    blocked_until: HashMap<u64, Instant>,
}

static API_KEY_POOLS: OnceLock<Mutex<HashMap<String, ApiKeyPoolState>>> = OnceLock::new();

#[derive(Debug, Default, Clone, Copy)]
struct RateLimitState {
    exhausted: bool,
    reset_after: Option<Duration>,
}

async fn send_with_retry<F>(
    pool_id: &str,
    api_key: Option<&str>,
    mut build_request: F,
    settings: &RetrySettings,
    error_key: &'static str,
) -> CommandResult<Response>
where
    F: FnMut(Option<&str>) -> RequestBuilder,
{
    let keys = parse_api_keys(api_key);
    let attempts = if settings.enabled {
        settings.max_attempts.clamp(1, 8)
    } else {
        1
    };
    let initial_delay = settings.initial_delay_ms.clamp(100, 60_000);
    let max_delay = settings.max_delay_ms.clamp(initial_delay, 300_000);
    let mut retry_round = 0_u32;
    let mut tried_keys = HashSet::new();

    loop {
        let selected_index = if keys.is_empty() {
            None
        } else if let Some(index) = first_available_key(pool_id, &keys, &tried_keys) {
            Some(index)
        } else {
            let (index, wait) = earliest_key_release(pool_id, &keys)
                .unwrap_or((0, Duration::ZERO));
            if settings.enabled
                && retry_round + 1 < attempts
                && wait > Duration::ZERO
                && wait <= Duration::from_millis(max_delay)
            {
                tokio::time::sleep(wait).await;
                retry_round += 1;
                tried_keys.clear();
                continue;
            }
            Some(index)
        };
        let selected_key = selected_index.map(|index| keys[index].as_str());

        match build_request(selected_key).send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                let rate_limit = rate_limit_state(&response);
                if let Some(index) = selected_index {
                    if status == 429 || rate_limit.exhausted {
                        block_api_key(
                            pool_id,
                            &keys[index],
                            rate_limit
                                .reset_after
                                .unwrap_or_else(|| Duration::from_secs(60)),
                        );
                    }
                }

                if status == 429 {
                    if let Some(index) = selected_index {
                        tried_keys.insert(index);
                    }
                    if first_available_key(pool_id, &keys, &tried_keys).is_some() {
                        continue;
                    }
                    if settings.enabled && retry_round + 1 < attempts {
                        let delay = rate_limit
                            .reset_after
                            .or_else(|| earliest_key_release(pool_id, &keys).map(|(_, wait)| wait))
                            .unwrap_or_else(|| {
                                exponential_delay(initial_delay, max_delay, retry_round + 1)
                            });
                        if delay <= Duration::from_millis(max_delay) {
                            tokio::time::sleep(delay).await;
                            retry_round += 1;
                            tried_keys.clear();
                            continue;
                        }
                    }
                    return Ok(response);
                }

                if retry_round + 1 < attempts && is_retryable_status(status) {
                    let delay = retry_after_delay(&response).unwrap_or_else(|| {
                        exponential_delay(initial_delay, max_delay, retry_round + 1)
                    });
                    tokio::time::sleep(delay).await;
                    retry_round += 1;
                    tried_keys.clear();
                    continue;
                }
                return Ok(response);
            }
            Err(error) => {
                if retry_round + 1 >= attempts || !is_retryable_request_error(&error) {
                    return Err(CommandError::with_detail(error_key, error));
                }
                tokio::time::sleep(exponential_delay(
                    initial_delay,
                    max_delay,
                    retry_round + 1,
                ))
                .await;
                retry_round += 1;
                tried_keys.clear();
            }
        }
    }
}

fn parse_api_keys(api_key: Option<&str>) -> Vec<String> {
    let mut seen = HashSet::new();
    api_key
        .into_iter()
        .flat_map(str::lines)
        .map(str::trim)
        .filter(|key| !key.is_empty())
        .filter(|key| seen.insert((*key).to_owned()))
        .map(str::to_owned)
        .collect()
}

fn api_key_fingerprint(key: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    hasher.finish()
}

fn api_key_pools() -> &'static Mutex<HashMap<String, ApiKeyPoolState>> {
    API_KEY_POOLS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn first_available_key(
    pool_id: &str,
    keys: &[String],
    excluded: &HashSet<usize>,
) -> Option<usize> {
    let now = Instant::now();
    let mut pools = api_key_pools().lock().ok()?;
    let pool = pools.entry(pool_id.to_owned()).or_default();
    pool.blocked_until.retain(|_, until| *until > now);
    keys.iter().enumerate().find_map(|(index, key)| {
        (!excluded.contains(&index)
            && !pool.blocked_until.contains_key(&api_key_fingerprint(key)))
        .then_some(index)
    })
}

fn earliest_key_release(pool_id: &str, keys: &[String]) -> Option<(usize, Duration)> {
    if keys.is_empty() {
        return None;
    }
    let now = Instant::now();
    let mut pools = api_key_pools().lock().ok()?;
    let pool = pools.entry(pool_id.to_owned()).or_default();
    pool.blocked_until.retain(|_, until| *until > now);
    keys.iter()
        .enumerate()
        .map(|(index, key)| {
            let wait = pool
                .blocked_until
                .get(&api_key_fingerprint(key))
                .map(|until| until.saturating_duration_since(now))
                .unwrap_or(Duration::ZERO);
            (index, wait)
        })
        .min_by_key(|(_, wait)| *wait)
}

fn block_api_key(pool_id: &str, key: &str, duration: Duration) {
    let duration = duration
        .max(Duration::from_millis(100))
        .min(Duration::from_secs(24 * 60 * 60));
    if let Ok(mut pools) = api_key_pools().lock() {
        pools
            .entry(pool_id.to_owned())
            .or_default()
            .blocked_until
            .insert(api_key_fingerprint(key), Instant::now() + duration);
    }
}

fn rate_limit_state(response: &Response) -> RateLimitState {
    rate_limit_state_from_headers(response.status().as_u16(), response.headers())
}

fn rate_limit_state_from_headers(status: u16, headers: &HeaderMap) -> RateLimitState {
    const REQUEST_REMAINING: &[&str] = &[
        "x-ratelimit-remaining-requests",
        "ratelimit-remaining-requests",
        "anthropic-ratelimit-requests-remaining",
    ];
    const REQUEST_RESET: &[&str] = &[
        "x-ratelimit-reset-requests",
        "ratelimit-reset-requests",
        "anthropic-ratelimit-requests-reset",
    ];
    const TOKEN_REMAINING: &[&str] = &[
        "x-ratelimit-remaining-tokens",
        "ratelimit-remaining-tokens",
        "anthropic-ratelimit-tokens-remaining",
    ];
    const TOKEN_RESET: &[&str] = &[
        "x-ratelimit-reset-tokens",
        "ratelimit-reset-tokens",
        "anthropic-ratelimit-tokens-reset",
    ];
    const GENERIC_REMAINING: &[&str] = &[
        "ratelimit-remaining",
        "x-rate-limit-remaining",
    ];
    const GENERIC_RESET: &[&str] = &[
        "x-ratelimit-reset",
        "ratelimit-reset",
        "x-rate-limit-reset",
        "x-ratelimit-reset-after",
    ];

    let groups: &[(&[&str], &[&str])] = &[
        (REQUEST_REMAINING, REQUEST_RESET),
        (TOKEN_REMAINING, TOKEN_RESET),
        (GENERIC_REMAINING, GENERIC_RESET),
    ];
    let mut exhausted = false;
    let mut reset_after = None;

    for (remaining_headers, reset_headers) in groups {
        if !remaining_headers.iter().any(|name| header_is_exhausted(headers, name)) {
            continue;
        }
        exhausted = true;
        if let Some(delay) = latest_header_delay(headers, reset_headers) {
            reset_after = Some(reset_after.map_or(delay, |current: Duration| current.max(delay)));
        }
    }

    if status == 429 {
        exhausted = true;
        reset_after = retry_after_delay_from_headers(headers)
            .or(reset_after)
            .or_else(|| {
                latest_header_delay(
                    headers,
                    &[
                        "x-ratelimit-reset-requests",
                        "x-ratelimit-reset-tokens",
                        "x-ratelimit-reset",
                        "ratelimit-reset",
                        "ratelimit-reset-requests",
                        "ratelimit-reset-tokens",
                        "anthropic-ratelimit-requests-reset",
                        "anthropic-ratelimit-tokens-reset",
                        "x-rate-limit-reset",
                        "x-ratelimit-reset-after",
                    ],
                )
            });
    }

    RateLimitState {
        exhausted,
        reset_after,
    }
}

fn header_is_exhausted(headers: &HeaderMap, name: &str) -> bool {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<f64>().ok())
        .is_some_and(|remaining| remaining <= 0.0)
}

fn latest_header_delay(headers: &HeaderMap, names: &[&str]) -> Option<Duration> {
    names
        .iter()
        .filter_map(|name| {
            headers
                .get(*name)
                .and_then(|value| value.to_str().ok())
                .and_then(parse_rate_limit_delay)
        })
        .max()
}

fn parse_rate_limit_delay(value: &str) -> Option<Duration> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty() {
        return None;
    }

    if let Some(timestamp) = parse_rfc3339_timestamp(&value) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .ok()?
            .as_secs_f64();
        return Some(Duration::from_secs_f64(
            (timestamp - now).max(0.0).min(86_400.0),
        ));
    }

    if let Ok(number) = value.parse::<f64>() {
        if !number.is_finite() || number < 0.0 {
            return None;
        }
        if number > 1_000_000_000.0 {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .ok()?
                .as_secs_f64();
            return Some(Duration::from_secs_f64(
                (number - now).max(0.0).min(86_400.0),
            ));
        }
        return Some(Duration::from_secs_f64(number.min(86_400.0)));
    }

    let bytes = value.as_bytes();
    let mut index = 0;
    let mut total_seconds = 0.0_f64;
    let mut parsed_any = false;
    while index < bytes.len() {
        while index < bytes.len() && bytes[index].is_ascii_whitespace() {
            index += 1;
        }
        let number_start = index;
        while index < bytes.len() && (bytes[index].is_ascii_digit() || bytes[index] == b'.') {
            index += 1;
        }
        if number_start == index {
            return None;
        }
        let number = value[number_start..index].parse::<f64>().ok()?;
        let unit_start = index;
        while index < bytes.len() && bytes[index].is_ascii_alphabetic() {
            index += 1;
        }
        let multiplier = match &value[unit_start..index] {
            "ms" => 0.001,
            "s" | "sec" | "secs" => 1.0,
            "m" | "min" | "mins" => 60.0,
            "h" | "hr" | "hrs" => 3_600.0,
            "d" | "day" | "days" => 86_400.0,
            _ => return None,
        };
        total_seconds += number * multiplier;
        parsed_any = true;
    }

    (parsed_any && total_seconds.is_finite() && total_seconds >= 0.0)
        .then(|| Duration::from_secs_f64(total_seconds.min(86_400.0)))
}

fn parse_rfc3339_timestamp(value: &str) -> Option<f64> {
    let (date, time_and_zone) = value.split_once('t')?;
    let mut date_parts = date.split('-');
    let year = date_parts.next()?.parse::<i64>().ok()?;
    let month = date_parts.next()?.parse::<u32>().ok()?;
    let day = date_parts.next()?.parse::<u32>().ok()?;
    if date_parts.next().is_some() || !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    let zone_index = time_and_zone
        .char_indices()
        .find_map(|(index, character)| {
            (character == 'z' || ((character == '+' || character == '-') && index > 0))
                .then_some(index)
        })?;
    let (time, zone) = time_and_zone.split_at(zone_index);
    let mut time_parts = time.split(':');
    let hour = time_parts.next()?.parse::<u32>().ok()?;
    let minute = time_parts.next()?.parse::<u32>().ok()?;
    let second = time_parts.next()?.parse::<f64>().ok()?;
    if time_parts.next().is_some() || hour > 23 || minute > 59 || !(0.0..61.0).contains(&second) {
        return None;
    }

    let offset_seconds = if zone == "z" {
        0_i64
    } else {
        let sign = if zone.starts_with('-') { -1_i64 } else { 1_i64 };
        let mut offset_parts = zone[1..].split(':');
        let offset_hour = offset_parts.next()?.parse::<i64>().ok()?;
        let offset_minute = offset_parts.next()?.parse::<i64>().ok()?;
        if offset_parts.next().is_some() || offset_hour > 23 || offset_minute > 59 {
            return None;
        }
        sign * (offset_hour * 3_600 + offset_minute * 60)
    };

    let days = days_from_civil(year, month, day);
    Some(
        days as f64 * 86_400.0
            + hour as f64 * 3_600.0
            + minute as f64 * 60.0
            + second
            - offset_seconds as f64,
    )
}

fn days_from_civil(year: i64, month: u32, day: u32) -> i64 {
    let year = year - if month <= 2 { 1 } else { 0 };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month = month as i64;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5
        + day as i64
        - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100
        + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn provider_pool_id_input(provider: &ProviderInput) -> String {
    provider.id.clone().unwrap_or_else(|| {
        format!(
            "draft:{}:{}:{}",
            provider.kind,
            provider.name.trim(),
            provider.base_url.as_deref().unwrap_or_default().trim()
        )
    })
}

fn exponential_delay(initial_ms: u64, max_ms: u64, failed_attempt: u32) -> Duration {
    let multiplier = 1_u64
        .checked_shl(failed_attempt.saturating_sub(1).min(20))
        .unwrap_or(u64::MAX);
    Duration::from_millis(initial_ms.saturating_mul(multiplier).min(max_ms))
}

fn retry_after_delay(response: &Response) -> Option<Duration> {
    retry_after_delay_from_headers(response.headers())
}

fn retry_after_delay_from_headers(headers: &HeaderMap) -> Option<Duration> {
    headers
        .get(reqwest::header::RETRY_AFTER)?
        .to_str()
        .ok()
        .and_then(parse_rate_limit_delay)
        .map(|delay| delay.min(Duration::from_secs(24 * 60 * 60)))
}

fn is_retryable_status(status: u16) -> bool {
    matches!(status, 408 | 409 | 425 | 429 | 500..=599)
}

fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect() || error.is_request() || error.is_body()
}

fn uses_ollama_embedding_api(provider: &Provider, endpoint: &str) -> bool {
    if matches!(provider.kind.as_str(), "ollama" | "ollama-cloud") {
        return true;
    }

    let path = endpoint
        .split(|character| character == '?' || character == '#')
        .next()
        .unwrap_or(endpoint);
    let normalized = path.trim_end_matches('/').to_ascii_lowercase();
    normalized.ends_with("/api/embed") || normalized.ends_with("/api/embeddings")
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
        .unwrap_or("-");
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
#[path = "provider_client_tests.rs"]
mod tests;
