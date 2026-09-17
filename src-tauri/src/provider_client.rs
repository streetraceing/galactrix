mod endpoints;
mod retry;

use std::future::Future;
use std::time::{Duration, Instant};

use futures_util::{Stream, StreamExt};
use reqwest::{Client, RequestBuilder};
use serde_json::{json, Value};
use tokio::sync::oneshot;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    CompletionResult, EmbeddingResult, Message, Provider, ProviderInput, ProviderModelResult,
    RetrySettings,
};
use endpoints::{
    embedding_endpoint_saved, ollama_base, ollama_base_saved, openai_base, openai_base_saved,
    required_text, uses_ollama_embedding_api, validate_provider, validate_saved_provider,
};
use retry::{
    buffer_json_response, provider_pool_id_input, send_with_retry, send_with_retry_raw,
    JsonResponse,
};

#[cfg(test)]
use retry::{
    block_api_key, exponential_delay, first_available_key, is_empty_json, is_retryable_status,
    parse_api_keys, parse_rate_limit_delay, rate_limit_state_from_headers, select_available_key,
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

#[derive(Debug, Clone)]
pub(crate) struct StreamedCompletion {
    pub completion: CompletionResult,
    pub cancelled: bool,
}

/// Streams a chat completion, forwarding every content delta to `on_delta`
/// as it arrives. The argument count mirrors the buffered [`complete`]; the
/// IPC command layer carries the same request shape. Cancellation stops the stream and returns the partial
/// text; a provider that answers with plain JSON instead of a stream falls
/// back to the buffered completion path.
#[allow(clippy::too_many_arguments)]
pub async fn complete_streaming(
    provider: &Provider,
    api_key: Option<&str>,
    history: &[Message],
    system_prompt: Option<&str>,
    user_content: Option<&str>,
    retry: &RetrySettings,
    cancellation: &mut oneshot::Receiver<()>,
    on_delta: impl FnMut(&str),
) -> CommandResult<StreamedCompletion> {
    let started = Instant::now();
    let is_ollama = matches!(provider.kind.as_str(), "ollama" | "ollama-cloud");
    let send = async {
        validate_saved_provider(provider, api_key)?;
        let client = streaming_http_client()?;
        let messages = build_request_messages(history, system_prompt, user_content);
        let (url, body) = match provider.kind.as_str() {
            "ollama" | "ollama-cloud" => (
                format!("{}/chat", ollama_base_saved(provider)),
                json!({
                    "model": provider.model,
                    "messages": messages,
                    "stream": true,
                    "options": {
                        "temperature": provider.temperature,
                        "top_p": provider.top_p,
                        "num_predict": provider.max_tokens,
                    }
                }),
            ),
            "character-ai" => {
                return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
            }
            _ => (
                format!("{}/chat/completions", openai_base_saved(provider)?),
                json!({
                    "model": provider.model,
                    "messages": messages,
                    "temperature": provider.temperature,
                    "top_p": provider.top_p,
                    "max_tokens": provider.max_tokens,
                    "stream": true,
                    "stream_options": { "include_usage": true },
                }),
            ),
        };
        send_with_retry_raw(
            &provider.id,
            api_key,
            |selected_key| authenticated(client.post(&url), selected_key).json(&body),
            retry,
            keys::PROVIDER_REQUEST_FAILED,
        )
        .await
    };
    let Some(response) = until_cancelled(send, cancellation).await else {
        return Ok(cancelled_completion(started.elapsed()));
    };
    let response = response?;

    let content_type = response
        .response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let streams_sse = content_type.contains("text/event-stream");
    if !streams_sse && !is_ollama {
        // The provider ignored `stream: true` and answered with plain JSON:
        // fall back to the buffered completion path.
        let Some(buffered) =
            until_cancelled(buffer_json_response(response.response), cancellation).await
        else {
            return Ok(cancelled_completion(started.elapsed()));
        };
        let JsonResponse { value, .. } = buffered?;
        let completion = finalize_json_completion(provider, value, started.elapsed())?;
        return Ok(StreamedCompletion {
            completion,
            cancelled: false,
        });
    }

    read_completion_stream(
        response.response.bytes_stream(),
        is_ollama,
        started,
        cancellation,
        on_delta,
    )
    .await
}

async fn until_cancelled<F: Future>(
    operation: F,
    cancellation: &mut oneshot::Receiver<()>,
) -> Option<F::Output> {
    tokio::select! {
        biased;
        _ = cancellation => None,
        result = operation => Some(result),
    }
}

fn cancelled_completion(elapsed: Duration) -> StreamedCompletion {
    StreamedCompletion {
        completion: CompletionResult {
            content: String::new(),
            input_tokens: 0,
            output_tokens: 0,
            latency_ms: elapsed.as_millis().min(i64::MAX as u128) as i64,
        },
        cancelled: true,
    }
}

async fn read_completion_stream<S, B, E>(
    stream: S,
    is_ollama: bool,
    started: Instant,
    cancellation: &mut oneshot::Receiver<()>,
    mut on_delta: impl FnMut(&str),
) -> CommandResult<StreamedCompletion>
where
    S: Stream<Item = Result<B, E>>,
    B: AsRef<[u8]>,
    E: std::fmt::Display,
{
    futures_util::pin_mut!(stream);
    let mut parser = StreamChunkParser::new(is_ollama);
    let mut accumulated = String::new();
    let mut pending = String::new();
    let mut usage: Option<(i64, i64)> = None;
    let mut cancelled = false;
    let mut failure = None;
    let mut last_flush = Instant::now();

    loop {
        let Some(chunk) = until_cancelled(stream.next(), cancellation).await else {
            cancelled = true;
            break;
        };
        let eof = chunk.is_none();
        let parsed = match chunk {
            Some(Ok(bytes)) => parser.push(bytes.as_ref()),
            Some(Err(error)) => {
                failure = Some(CommandError::with_detail(
                    keys::PROVIDER_RESPONSE_READ_FAILED,
                    error,
                ));
                break;
            }
            None => parser.finish(),
        };
        accumulated.push_str(&parsed.delta);
        pending.push_str(&parsed.delta);
        if parsed.usage.is_some() {
            usage = parsed.usage;
        }
        if let Some(error) = parsed.error {
            failure = Some(CommandError::with_detail(
                keys::PROVIDER_REQUEST_FAILED,
                error,
            ));
            break;
        }
        if eof && !parsed.finished {
            failure = Some(CommandError::with_detail(
                keys::PROVIDER_RESPONSE_READ_FAILED,
                "stream ended before a completion marker",
            ));
            break;
        }
        if !pending.is_empty()
            && (pending.len() >= 120 || last_flush.elapsed() >= Duration::from_millis(60))
        {
            on_delta(&pending);
            pending.clear();
            last_flush = Instant::now();
        }
        if parsed.finished {
            break;
        }
    }

    // Flush even on failure: the fallback layer must know that this provider
    // already produced content, including content preceding an error in one chunk.
    if !pending.is_empty() {
        on_delta(&pending);
    }
    if let Some(error) = failure {
        return Err(error);
    }

    let content = accumulated.trim().to_owned();
    if content.is_empty() && !cancelled {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }

    Ok(StreamedCompletion {
        completion: CompletionResult {
            content,
            input_tokens: usage.map(|(input, _)| input).unwrap_or(0),
            output_tokens: usage.map(|(_, output)| output).unwrap_or(0),
            latency_ms: started.elapsed().as_millis().min(i64::MAX as u128) as i64,
        },
        cancelled,
    })
}

/// Incremental parser for streamed provider payloads: OpenAI-compatible SSE
/// (`data: {...}` lines with a `[DONE]` terminator) and Ollama ndjson lines.
/// Chunks may split lines and multi-byte characters anywhere, so the parser
/// buffers bytes until a newline or EOF. A finish reason also completes SSE
/// at EOF, after any trailing usage frame has been read.
pub(crate) struct StreamChunkParser {
    is_ollama: bool,
    buffer: Vec<u8>,
    finished: bool,
    failed: bool,
    finish_reason_received: bool,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub(crate) struct ParsedStreamChunk {
    pub delta: String,
    pub usage: Option<(i64, i64)>,
    pub error: Option<String>,
    pub finished: bool,
}

impl StreamChunkParser {
    pub(crate) fn new(is_ollama: bool) -> Self {
        Self {
            is_ollama,
            buffer: Vec::new(),
            finished: false,
            failed: false,
            finish_reason_received: false,
        }
    }

    pub(crate) fn push(&mut self, bytes: &[u8]) -> ParsedStreamChunk {
        let mut parsed = ParsedStreamChunk::default();
        if self.finished || self.failed {
            return parsed;
        }
        self.buffer.extend_from_slice(bytes);

        while let Some(position) = self.buffer.iter().position(|byte| *byte == b'\n') {
            let line_bytes: Vec<u8> = self.buffer.drain(..=position).collect();
            self.parse_line(&line_bytes, &mut parsed);
            if self.finished || self.failed {
                self.buffer.clear();
                break;
            }
        }
        parsed.finished = self.finished;
        parsed
    }

    fn finish(&mut self) -> ParsedStreamChunk {
        let mut parsed = ParsedStreamChunk::default();
        if !self.finished && !self.failed {
            let trailing = std::mem::take(&mut self.buffer);
            self.parse_line(&trailing, &mut parsed);
            // Some SSE servers close after finish_reason instead of [DONE].
            // Keep reading until EOF so a subsequent usage frame is not lost.
            if self.finish_reason_received && !self.failed {
                self.finished = true;
            }
        }
        parsed.finished = self.finished;
        parsed
    }

    fn parse_line(&mut self, bytes: &[u8], parsed: &mut ParsedStreamChunk) {
        let line = match std::str::from_utf8(bytes) {
            Ok(line) => line.trim(),
            Err(error) => {
                parsed.error = Some(error.to_string());
                self.failed = true;
                return;
            }
        };
        if line.is_empty() {
            return;
        }
        if self.is_ollama {
            self.parse_ollama_line(line, parsed);
        } else {
            self.parse_sse_line(line, parsed);
        }
    }

    fn parse_payload(&mut self, payload: &str, parsed: &mut ParsedStreamChunk) -> Option<Value> {
        let value = match serde_json::from_str::<Value>(payload) {
            Ok(value) => value,
            Err(error) => {
                parsed.error = Some(error.to_string());
                self.failed = true;
                return None;
            }
        };
        if let Some(message) = value
            .pointer("/error/message")
            .or_else(|| value.get("error"))
            .and_then(Value::as_str)
        {
            parsed.error = Some(message.to_owned());
            self.failed = true;
            return None;
        }
        Some(value)
    }

    fn parse_sse_line(&mut self, line: &str, parsed: &mut ParsedStreamChunk) {
        let Some(payload) = line.strip_prefix("data:") else {
            return;
        };
        let payload = payload.trim();
        if payload == "[DONE]" {
            self.finished = true;
            return;
        }
        if payload.is_empty() {
            return;
        }
        let Some(value) = self.parse_payload(payload, parsed) else {
            return;
        };
        if value
            .pointer("/choices/0/finish_reason")
            .and_then(Value::as_str)
            .is_some_and(|reason| !reason.is_empty())
        {
            self.finish_reason_received = true;
        }
        if let Some(text) = value
            .pointer("/choices/0/delta/content")
            .and_then(Value::as_str)
        {
            parsed.delta.push_str(text);
        }
        if let Some(usage) = value.get("usage").filter(|usage| usage.is_object()) {
            parsed.usage = Some((
                usage
                    .get("prompt_tokens")
                    .and_then(Value::as_i64)
                    .unwrap_or(0),
                usage
                    .get("completion_tokens")
                    .and_then(Value::as_i64)
                    .unwrap_or(0),
            ));
        }
    }

    fn parse_ollama_line(&mut self, line: &str, parsed: &mut ParsedStreamChunk) {
        let Some(value) = self.parse_payload(line, parsed) else {
            return;
        };
        if let Some(text) = value.pointer("/message/content").and_then(Value::as_str) {
            parsed.delta.push_str(text);
        }
        if value.get("done").and_then(Value::as_bool) == Some(true) {
            self.finished = true;
            parsed.usage = Some((
                value
                    .get("prompt_eval_count")
                    .and_then(Value::as_i64)
                    .unwrap_or(0),
                value.get("eval_count").and_then(Value::as_i64).unwrap_or(0),
            ));
        }
    }
}

fn build_request_messages(
    history: &[Message],
    system_prompt: Option<&str>,
    user_content: Option<&str>,
) -> Vec<Value> {
    system_prompt
        .map(|content| json!({"role": "system", "content": content}))
        .into_iter()
        .chain(
            history
                .iter()
                .filter(|message| matches!(message.role.as_str(), "system" | "user" | "assistant"))
                .map(|message| json!({"role": message.role, "content": message.content})),
        )
        .chain(user_content.map(|content| json!({"role": "user", "content": content})))
        .collect()
}

fn finalize_json_completion(
    provider: &Provider,
    value: Value,
    elapsed: Duration,
) -> CommandResult<CompletionResult> {
    let latency_ms = elapsed.as_millis().min(i64::MAX as u128) as i64;

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

fn streaming_http_client() -> CommandResult<Client> {
    // No total timeout: a long stream must not be cut off mid-response. The
    // per-read timeout bounds a stalled connection instead.
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(180))
        .user_agent("Galactrix/1.0")
        .build()
        .map_err(CommandError::internal)
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
