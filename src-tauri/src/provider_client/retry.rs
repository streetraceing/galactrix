use std::collections::{hash_map::DefaultHasher, HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use reqwest::{header::HeaderMap, RequestBuilder, Response};
use serde_json::{json, Value};

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{ProviderInput, RetrySettings};

#[derive(Default)]
struct ApiKeyPoolState {
    blocked_until: HashMap<u64, Instant>,
}

static API_KEY_POOLS: OnceLock<Mutex<HashMap<String, ApiKeyPoolState>>> = OnceLock::new();

#[derive(Debug, Default, Clone, Copy)]
pub(super) struct RateLimitState {
    pub(super) exhausted: bool,
    pub(super) reset_after: Option<Duration>,
}

pub(super) struct JsonResponse {
    pub(super) status: u16,
    pub(super) value: Value,
}

pub(super) async fn send_with_retry<F>(
    pool_id: &str,
    api_key: Option<&str>,
    mut build_request: F,
    settings: &RetrySettings,
    error_key: &'static str,
) -> CommandResult<JsonResponse>
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
            let (index, wait) = earliest_key_release(pool_id, &keys).unwrap_or((0, Duration::ZERO));
            if settings.enabled && retry_round + 1 < attempts && wait > Duration::ZERO {
                tokio::time::sleep(wait).await;
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
                        tokio::time::sleep(delay).await;
                        retry_round += 1;
                        tried_keys.clear();
                        continue;
                    }
                    return buffer_json_response(response).await;
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
                match buffer_json_response(response).await {
                    Ok(response) => return Ok(response),
                    Err(_) if retry_round + 1 < attempts => {
                        tokio::time::sleep(exponential_delay(
                            initial_delay,
                            max_delay,
                            retry_round + 1,
                        ))
                        .await;
                        retry_round += 1;
                        tried_keys.clear();
                    }
                    Err(error) => return Err(error),
                }
            }
            Err(error) => {
                if retry_round + 1 >= attempts || !is_retryable_request_error(&error) {
                    return Err(CommandError::with_detail(error_key, error));
                }
                tokio::time::sleep(exponential_delay(initial_delay, max_delay, retry_round + 1))
                    .await;
                retry_round += 1;
                tried_keys.clear();
            }
        }
    }
}

async fn buffer_json_response(response: Response) -> CommandResult<JsonResponse> {
    let status = response.status().as_u16();
    let body = match response.bytes().await {
        Ok(body) => body,
        Err(error) if (200..300).contains(&status) => {
            return Err(CommandError::with_detail(
                keys::PROVIDER_RESPONSE_READ_FAILED,
                error,
            ));
        }
        Err(error) => {
            return Ok(JsonResponse {
                status,
                value: json!({ "raw": error.to_string() }),
            });
        }
    };

    match serde_json::from_slice::<Value>(&body) {
        Ok(value) if (200..300).contains(&status) && is_empty_json(&value) => Err(
            CommandError::with_detail(keys::PROVIDER_RESPONSE_READ_FAILED, "empty JSON response"),
        ),
        Ok(value) => Ok(JsonResponse { status, value }),
        Err(error) if (200..300).contains(&status) => Err(CommandError::with_detail(
            keys::PROVIDER_RESPONSE_READ_FAILED,
            error,
        )),
        Err(_) => Ok(JsonResponse {
            status,
            value: json!({ "raw": String::from_utf8_lossy(&body) }),
        }),
    }
}

pub(super) fn is_empty_json(value: &Value) -> bool {
    match value {
        Value::Null => true,
        Value::String(value) => value.trim().is_empty(),
        Value::Array(value) => value.is_empty(),
        Value::Object(value) => value.is_empty(),
        Value::Bool(_) | Value::Number(_) => false,
    }
}

pub(super) fn parse_api_keys(api_key: Option<&str>) -> Vec<String> {
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

pub(super) fn first_available_key(
    pool_id: &str,
    keys: &[String],
    excluded: &HashSet<usize>,
) -> Option<usize> {
    let now = Instant::now();
    let mut pools = api_key_pools().lock().ok()?;
    let pool = pools.entry(pool_id.to_owned()).or_default();
    pool.blocked_until.retain(|_, until| *until > now);
    keys.iter().enumerate().find_map(|(index, key)| {
        (!excluded.contains(&index) && !pool.blocked_until.contains_key(&api_key_fingerprint(key)))
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

pub(super) fn block_api_key(pool_id: &str, key: &str, duration: Duration) {
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

pub(super) fn rate_limit_state_from_headers(status: u16, headers: &HeaderMap) -> RateLimitState {
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
    const GENERIC_REMAINING: &[&str] = &["ratelimit-remaining", "x-rate-limit-remaining"];
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
        if !remaining_headers
            .iter()
            .any(|name| header_is_exhausted(headers, name))
        {
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

pub(super) fn parse_rate_limit_delay(value: &str) -> Option<Duration> {
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
            (timestamp - now).clamp(0.0, 86_400.0),
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
            return Some(Duration::from_secs_f64((number - now).clamp(0.0, 86_400.0)));
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
        days as f64 * 86_400.0 + hour as f64 * 3_600.0 + minute as f64 * 60.0 + second
            - offset_seconds as f64,
    )
}

fn days_from_civil(year: i64, month: u32, day: u32) -> i64 {
    let year = year - if month <= 2 { 1 } else { 0 };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month = month as i64;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day as i64 - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

pub(super) fn provider_pool_id_input(provider: &ProviderInput) -> String {
    provider.id.clone().unwrap_or_else(|| {
        format!(
            "draft:{}:{}:{}",
            provider.kind,
            provider.name.trim(),
            provider.base_url.as_deref().unwrap_or_default().trim()
        )
    })
}

pub(super) fn exponential_delay(initial_ms: u64, max_ms: u64, failed_attempt: u32) -> Duration {
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

pub(super) fn is_retryable_status(status: u16) -> bool {
    matches!(status, 408 | 409 | 425 | 429 | 500..=599)
}

fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect() || error.is_request() || error.is_body()
}
