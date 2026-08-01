mod ai_context;
mod db;
mod dynamic_context;
mod i18n;
mod models;
mod prompt_builder;
mod provider_client;
mod semantic_memory;
mod response_rules;
mod secure_storage;
#[cfg(windows)]
mod windows_window;

use std::{collections::HashMap, sync::Mutex};

use futures_util::future::{select, Either};
use i18n::{keys, CommandError, CommandResult};
use models::{
    AppSettings, AppSnapshot, ChatConfigInput, ChatState, CompletionResult, CreatedChat,
    EmbeddingProbeResult, GalaxyItem, GalaxyItemInput, Message, Provider,
    PromptPreviewInput, PromptPreviewResult, ProviderImportInput, ProviderInput,
    ProviderModelResult, RetrySettings,
};
use rusqlite::Connection;
use tauri::{Manager, State};
use tokio::sync::{oneshot, oneshot::error::TryRecvError};
use uuid::Uuid;

#[cfg(target_os = "android")]
#[export_name = "Java_ru_streetraceing_galactrix_MainActivity_initializeRustlsPlatformVerifier"]
pub extern "system" fn initialize_rustls_platform_verifier<'local>(
    mut env: jni::EnvUnowned<'local>,
    _activity: jni::objects::JObject<'local>,
    context: jni::objects::JObject<'local>,
) {
    env.with_env(|env| rustls_platform_verifier::android::init_with_env(env, context))
        .resolve::<jni::errors::ThrowRuntimeExAndDefault>()
}

enum GenerationControl {
    Active(oneshot::Sender<()>),
    Cancelled,
}

struct AppState {
    database: Mutex<Connection>,
    generations: Mutex<HashMap<String, GenerationControl>>,
}

fn register_generation(
    state: &AppState,
    generation_id: &str,
) -> CommandResult<oneshot::Receiver<()>> {
    let (sender, receiver) = oneshot::channel();
    let mut generations = state
        .generations
        .lock()
        .map_err(CommandError::internal)?;

    match generations.remove(generation_id) {
        Some(GenerationControl::Active(previous)) => {
            let _ = previous.send(());
        }
        Some(GenerationControl::Cancelled) => {
            drop(sender);
            return Ok(receiver);
        }
        None => {}
    }

    generations.insert(
        generation_id.to_owned(),
        GenerationControl::Active(sender),
    );
    Ok(receiver)
}

fn finish_generation(state: &AppState, generation_id: &str) {
    if let Ok(mut generations) = state.generations.lock() {
        generations.remove(generation_id);
    }
}

async fn complete_cancellable(
    provider: &Provider,
    secret: Option<&str>,
    history: &[Message],
    system_prompt: Option<&str>,
    appended_user_message: Option<&str>,
    retry: &RetrySettings,
    mut cancellation: oneshot::Receiver<()>,
) -> CommandResult<CompletionResult> {
    match cancellation.try_recv() {
        Ok(()) | Err(TryRecvError::Closed) => {
            return Err(CommandError::new(keys::PROVIDER_REQUEST_CANCELLED));
        }
        Err(TryRecvError::Empty) => {}
    }

    let completion = Box::pin(provider_client::complete(
        provider,
        secret,
        history,
        system_prompt,
        appended_user_message,
        retry,
    ));
    let cancellation = Box::pin(cancellation);
    match select(completion, cancellation).await {
        Either::Left((result, _)) => result,
        Either::Right((_, _)) => Err(CommandError::new(keys::PROVIDER_REQUEST_CANCELLED)),
    }
}

#[tauri::command]
fn cancel_generation(
    generation_id: String,
    state: State<'_, AppState>,
) -> CommandResult<bool> {
    let mut generations = state
        .generations
        .lock()
        .map_err(CommandError::internal)?;
    match generations.remove(&generation_id) {
        Some(GenerationControl::Active(sender)) => Ok(sender.send(()).is_ok()),
        Some(GenerationControl::Cancelled) => {
            generations.insert(generation_id, GenerationControl::Cancelled);
            Ok(true)
        }
        None => {
            generations.insert(generation_id, GenerationControl::Cancelled);
            Ok(true)
        }
    }
}

#[tauri::command]
fn get_chat_state(chat_id: String, state: State<'_, AppState>) -> CommandResult<ChatState> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::chat_state(&database, &chat_id)
}

#[tauri::command]
fn get_app_snapshot(state: State<'_, AppState>) -> CommandResult<AppSnapshot> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    let mut snapshot = db::snapshot(&database, env!("CARGO_PKG_VERSION"))?;
    for provider in &mut snapshot.providers {
        provider.has_secret = secure_storage::has_provider_secret(&provider.id);
    }
    Ok(snapshot)
}

#[tauri::command]
fn create_chat(input: ChatConfigInput, state: State<'_, AppState>) -> CommandResult<CreatedChat> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(CommandError::new(keys::CHAT_TITLE_REQUIRED));
    }

    let id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::create_chat(&database, &id, &input)?;
    Ok(CreatedChat {
        id,
        title: title.into(),
    })
}

#[tauri::command]
fn update_chat_config(
    chat_id: String,
    input: ChatConfigInput,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::update_chat_config(&database, &chat_id, &input)?;
    Ok(())
}

#[tauri::command]
fn rename_chat(
    chat_id: String,
    title: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let title = title.trim();
    if title.is_empty() {
        return Err(CommandError::new(keys::CHAT_TITLE_REQUIRED));
    }
    if title.chars().count() > 120 {
        return Err(CommandError::new(keys::CHAT_TITLE_TOO_LONG));
    }
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::rename_chat(&database, &chat_id, title)?;
    Ok(())
}

#[tauri::command]
fn delete_chat(chat_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::delete_chat(&database, &chat_id)?;
    Ok(())
}

#[tauri::command]
fn set_chat_pinned(
    chat_id: String,
    pinned: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::set_chat_pinned(&database, &chat_id, pinned)?;
    Ok(())
}

#[tauri::command]
fn clear_chat(chat_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::clear_chat(&database, &chat_id)?;
    Ok(())
}

#[tauri::command]
fn clone_chat(
    chat_id: String,
    title: String,
    include_messages: bool,
    input: Option<ChatConfigInput>,
    state: State<'_, AppState>,
) -> CommandResult<CreatedChat> {
    let new_id = Uuid::new_v4().to_string();
    let requested_title = input
        .as_ref()
        .map(|config| config.title.as_str())
        .unwrap_or(title.as_str())
        .trim()
        .to_owned();
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::clone_chat(
        &database,
        &chat_id,
        &new_id,
        &requested_title,
        include_messages,
        None,
    )?;

    if let Some(input) = input {
        if let Err(error) = db::update_chat_config(&database, &new_id, &input) {
            let _ = db::delete_chat(&database, &new_id);
            return Err(error);
        }
    }

    Ok(CreatedChat {
        id: new_id,
        title: requested_title,
    })
}

#[tauri::command]
fn branch_chat(
    message_id: String,
    title: String,
    state: State<'_, AppState>,
) -> CommandResult<CreatedChat> {
    let new_id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(CommandError::internal)?;
    let source_chat_id = database
        .query_row(
            "SELECT chat_id FROM messages WHERE id = ?1",
            rusqlite::params![message_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    let title = db::clone_chat(
        &database,
        &source_chat_id,
        &new_id,
        &title,
        true,
        Some(&message_id),
    )?;
    Ok(CreatedChat { id: new_id, title })
}

#[tauri::command]
fn edit_message(
    message_id: String,
    content: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let content = content.trim();
    if content.is_empty() {
        return Err(CommandError::new(keys::MESSAGE_EMPTY));
    }
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::edit_message(
        &database,
        &message_id,
        &Uuid::new_v4().to_string(),
        content,
    )?;
    Ok(())
}

#[tauri::command]
fn delete_message(message_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::delete_message(&database, &message_id)?;
    Ok(())
}

#[tauri::command]
fn delete_messages(message_ids: Vec<String>, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::delete_messages(&database, &message_ids)?;
    Ok(())
}

#[tauri::command]
fn set_message_remembered(
    message_id: String,
    remembered: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::set_message_remembered(&database, &message_id, remembered)?;
    Ok(())
}

#[tauri::command]
fn select_message_variant(
    message_id: String,
    variant_index: i64,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::select_message_variant(&database, &message_id, variant_index)?;
    Ok(())
}

fn build_chat_system_prompt(
    database: &Connection,
    chat_id: &str,
    history: &[models::Message],
    response_language: Option<&str>,
) -> CommandResult<Option<String>> {
    let context = db::get_chat_prompt_context(database, chat_id)?;
    let prompt = prompt_builder::build_system_prompt(&context, history, response_language);
    Ok(prompt.map(|prompt| {
        prompt_builder::resolve_assistant_placeholders(prompt, &context)
    }))
}

struct PreparedGeneration {
    history: Vec<Message>,
    system_prompt: Option<String>,
    retry: RetrySettings,
}

fn append_prompt_section(base: &mut Option<String>, section: Option<String>) {
    let Some(section) = section.map(|value| value.trim().to_owned()).filter(|value| !value.is_empty()) else {
        return;
    };
    match base {
        Some(prompt) if !prompt.trim().is_empty() => {
            prompt.push_str("\n\n");
            prompt.push_str(&section);
        }
        _ => *base = Some(section),
    }
}

fn provider_secret_or_none(provider: &Provider) -> Option<String> {
    match secret_for_saved_provider(provider) {
        Ok(secret) => secret,
        Err(error) => {
            eprintln!(
                "AI auxiliary provider '{}' is unavailable: {}",
                provider.name, error
            );
            None
        }
    }
}

async fn prepare_generation_context(
    state: &AppState,
    chat_id: &str,
    full_history: &[Message],
    chat_provider: &Provider,
    query_text: &str,
    response_language: Option<&str>,
) -> CommandResult<PreparedGeneration> {
    let (settings, mut context, mut system_prompt, analysis_provider, embedding_provider) = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        let settings = db::get_settings(&database)?;
        let context = db::get_dynamic_context(&database, chat_id)?;
        let system_prompt = build_chat_system_prompt(
            &database,
            chat_id,
            full_history,
            response_language,
        )?;
        let analysis_provider = settings
            .ai_modules
            .dynamic_context
            .provider_id
            .as_deref()
            .and_then(|id| db::provider_optional(&database, id).ok().flatten())
            .or_else(|| Some(chat_provider.clone()));
        let embedding_provider = settings
            .ai_modules
            .semantic_memory
            .provider_id
            .as_deref()
            .and_then(|id| db::provider_optional(&database, id).ok().flatten())
            .or_else(|| Some(chat_provider.clone()));
        (
            settings,
            context,
            system_prompt,
            analysis_provider,
            embedding_provider,
        )
    };

    let retry = settings.ai_modules.retry.clone();
    let dynamic_settings = &settings.ai_modules.dynamic_context;
    if dynamic_settings.enabled {
        let batch = dynamic_context::pending_batch(
            full_history,
            context.as_ref(),
            dynamic_settings,
        );
        if !batch.is_empty() {
            let analysis_secret = analysis_provider
                .as_ref()
                .and_then(provider_secret_or_none);
            let model_provider = if dynamic_settings.mode == "local" {
                None
            } else {
                analysis_provider.as_ref()
            };
            let outcome = ai_context::analyze_dialogue(
                dynamic_settings,
                context.as_ref(),
                &batch,
                model_provider,
                analysis_secret.as_deref(),
                &retry,
            )
            .await;
            if let Some(warning) = outcome.warning.as_ref() {
                eprintln!("Dynamic context analysis fell back to local mode: {warning}");
            }
            {
                let database = state.database.lock().map_err(CommandError::internal)?;
                db::save_dynamic_context(&database, chat_id, &outcome.state)?;
                if let (Some(usage), Some(provider)) =
                    (outcome.usage.as_ref(), analysis_provider.as_ref())
                {
                    db::record_usage(
                        &database,
                        &Uuid::new_v4().to_string(),
                        &provider.id,
                        &provider.model,
                        usage.input_tokens,
                        usage.output_tokens,
                    )?;
                }
            }
            context = Some(outcome.state);
        }
        append_prompt_section(
            &mut system_prompt,
            context
                .as_ref()
                .and_then(dynamic_context::render_context_section),
        );
    }

    let semantic_settings = &settings.ai_modules.semantic_memory;
    if semantic_settings.enabled {
        if let Some(provider) = embedding_provider.as_ref() {
            let embedding_model = provider
                .embedding_model
                .as_deref()
                .map(str::trim)
                .filter(|model| !model.is_empty());
            if let Some(embedding_model) = embedding_model {
                let semantic_context = dynamic_settings
                    .enabled
                    .then_some(context.as_ref())
                    .flatten();
                let candidates = semantic_memory::build_candidates(
                    full_history,
                    semantic_context,
                    semantic_settings,
                );
                let embedding_secret = provider_secret_or_none(provider);
                let indexed = {
                    let database = state.database.lock().map_err(CommandError::internal)?;
                    db::prune_semantic_memories(
                        &database,
                        chat_id,
                        &provider.id,
                        embedding_model,
                        &candidates,
                    )?;
                    db::semantic_memory_indexed_contents(
                        &database,
                        chat_id,
                        &provider.id,
                        embedding_model,
                    )?
                };

                match ai_context::embed_missing_candidates(
                    provider,
                    embedding_secret.as_deref(),
                    &retry,
                    &candidates,
                    &indexed,
                    semantic_settings.batch_size,
                )
                .await
                {
                    Ok(embedded) if !embedded.is_empty() => {
                        let database = state.database.lock().map_err(CommandError::internal)?;
                        db::upsert_semantic_memories(
                            &database,
                            chat_id,
                            &provider.id,
                            embedding_model,
                            &embedded,
                        )?;
                    }
                    Ok(_) => {}
                    Err(error) => {
                        eprintln!("Semantic memory indexing skipped: {error}");
                    }
                }

                let query = query_text.trim();
                if !query.is_empty() {
                    match provider_client::embed(
                        provider,
                        embedding_secret.as_deref(),
                        &[query.to_owned()],
                        &retry,
                    )
                    .await
                    {
                        Ok(result) => {
                            if let Some(query_embedding) = result.embeddings.first() {
                                let mut records = {
                                    let database =
                                        state.database.lock().map_err(CommandError::internal)?;
                                    db::list_semantic_memories(
                                        &database,
                                        chat_id,
                                        &provider.id,
                                        embedding_model,
                                    )?
                                };
                                let selected = semantic_memory::select_relevant(
                                    &mut records,
                                    query_embedding,
                                    semantic_settings.top_k,
                                    semantic_settings.similarity_threshold,
                                );
                                append_prompt_section(
                                    &mut system_prompt,
                                    semantic_memory::render_memory_section(&selected),
                                );
                            }
                        }
                        Err(error) => {
                            eprintln!("Semantic memory retrieval skipped: {error}");
                        }
                    }
                }
            } else {
                eprintln!(
                    "Semantic memory is enabled, but provider '{}' has no embedding model",
                    provider.name
                );
            }
        }
    }

    let history = if dynamic_settings.enabled {
        dynamic_context::trim_history(
            full_history,
            context.as_ref(),
            dynamic_settings.direct_message_limit,
        )
    } else {
        full_history.to_vec()
    };

    Ok(PreparedGeneration {
        history,
        system_prompt,
        retry,
    })
}

fn preview_galaxy_item(input: GalaxyItemInput) -> GalaxyItem {
    GalaxyItem {
        id: input.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        kind: input.kind,
        name: input.name,
        description: input.description,
        data: input.data,
        badge: String::new(),
        accent: String::new(),
        updated_at: 0,
    }
}

fn approximate_token_count(value: &str) -> i64 {
    if value.trim().is_empty() {
        return 0;
    }

    value
        .split_whitespace()
        .map(|word| {
            let characters = word.chars().count() as f64;
            let divisor = if word.is_ascii() { 4.0 } else { 2.4 };
            (characters / divisor).ceil().max(1.0) as i64
        })
        .sum()
}

#[tauri::command]
fn preview_prompt(input: PromptPreviewInput) -> PromptPreviewResult {
    let user_name = input
        .user_name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .or_else(|| {
            input
                .persona
                .as_ref()
                .map(|item| item.name.trim())
                .filter(|name| !name.is_empty())
        })
        .unwrap_or("{{user}}")
        .to_owned();
    let character_name = input
        .character_name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .or_else(|| {
            input
                .character
                .as_ref()
                .map(|item| item.name.trim())
                .filter(|name| !name.is_empty())
        })
        .unwrap_or("Assistant")
        .to_owned();
    let context = models::ChatPromptContext {
        persona: input.persona.map(preview_galaxy_item),
        character: input.character.map(preview_galaxy_item),
        universe: input.universe.map(preview_galaxy_item),
        worldbooks: input
            .worldbooks
            .into_iter()
            .map(preview_galaxy_item)
            .collect(),
        character_style: input.character_style.map(preview_galaxy_item),
        prompt_sets: input
            .prompt_sets
            .into_iter()
            .map(preview_galaxy_item)
            .collect(),
        prompt_config: input.prompt_config,
    };
    let prompt = prompt_builder::build_system_prompt(
        &context,
        &input.remembered_messages,
        input.response_language.as_deref(),
    )
    .unwrap_or_default()
    .replace("{{user}}", &user_name)
    .replace("{{char}}", &character_name);

    PromptPreviewResult {
        approximate_tokens: approximate_token_count(&prompt),
        characters: prompt.chars().count() as i64,
        prompt,
    }
}

#[tauri::command]
async fn regenerate_message(
    message_id: String,
    generation_id: String,
    response_language: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let (chat_id, provider, full_history, regeneration_mode) = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        let (chat_id, history) = db::messages_before_message(&database, &message_id)?;
        let regeneration_mode = response_rules::regeneration_mode(
            history.last().map(|message| message.role.as_str()),
        )
        .ok_or_else(|| CommandError::new(keys::MESSAGE_USER_BEFORE_ASSISTANT_MISSING))?;
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        (
            chat_id,
            db::get_provider(&database, &provider_id)?,
            history,
            regeneration_mode,
        )
    };
    let regeneration_instruction =
        response_rules::regeneration_instruction(regeneration_mode, response_language.as_deref());
    let query_text = full_history
        .last()
        .map(|message| message.content.as_str())
        .or(regeneration_instruction)
        .unwrap_or("Regenerate the response");
    let prepared = prepare_generation_context(
        &state,
        &chat_id,
        &full_history,
        &provider,
        query_text,
        response_language.as_deref(),
    )
    .await?;
    let secret = secret_for_saved_provider(&provider)?;
    let cancellation = register_generation(&state, &generation_id)?;
    let completion = complete_cancellable(
        &provider,
        secret.as_deref(),
        &prepared.history,
        prepared.system_prompt.as_deref(),
        regeneration_instruction,
        &prepared.retry,
        cancellation,
    )
    .await;
    finish_generation(&state, &generation_id);
    let completion = match completion {
        Ok(completion) => completion,
        Err(error) => {
            if error.key != keys::PROVIDER_REQUEST_CANCELLED {
                if let Ok(database) = state.database.lock() {
                    let _ = db::update_provider_health(&database, &provider.id, "error", None);
                }
            }
            return Err(error);
        }
    };

    let response_content = response_rules::normalize_response(&completion.content);
    if response_content.is_empty() {
        if let Ok(database) = state.database.lock() {
            let _ = db::update_provider_health(&database, &provider.id, "error", None);
        }
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }

    let database = state.database.lock().map_err(CommandError::internal)?;
    db::append_message_variant(
        &database,
        &message_id,
        &Uuid::new_v4().to_string(),
        &response_content,
    )?;
    db::record_usage(
        &database,
        &Uuid::new_v4().to_string(),
        &provider.id,
        &provider.model,
        completion.input_tokens,
        completion.output_tokens,
    )?;
    db::update_provider_health(
        &database,
        &provider.id,
        "connected",
        Some(completion.latency_ms),
    )?;
    Ok(())
}

#[tauri::command]
async fn continue_message(
    message_id: String,
    generation_id: String,
    response_language: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let (chat_id, provider, full_history) = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        let (chat_id, history) = db::messages_through_message(&database, &message_id)?;
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        (
            chat_id,
            db::get_provider(&database, &provider_id)?,
            history,
        )
    };
    let instruction = response_rules::continuation_instruction(response_language.as_deref());
    let query_text = full_history
        .last()
        .map(|message| message.content.as_str())
        .unwrap_or(instruction);
    let prepared = prepare_generation_context(
        &state,
        &chat_id,
        &full_history,
        &provider,
        query_text,
        response_language.as_deref(),
    )
    .await?;
    let secret = secret_for_saved_provider(&provider)?;
    let cancellation = register_generation(&state, &generation_id)?;
    let completion = complete_cancellable(
        &provider,
        secret.as_deref(),
        &prepared.history,
        prepared.system_prompt.as_deref(),
        Some(instruction),
        &prepared.retry,
        cancellation,
    )
    .await;
    finish_generation(&state, &generation_id);
    let completion = match completion {
        Ok(completion) => completion,
        Err(error) => {
            if error.key != keys::PROVIDER_REQUEST_CANCELLED {
                if let Ok(database) = state.database.lock() {
                    let _ = db::update_provider_health(&database, &provider.id, "error", None);
                }
            }
            return Err(error);
        }
    };

    let continuation = response_rules::normalize_response(&completion.content);
    if continuation.is_empty() {
        if let Ok(database) = state.database.lock() {
            let _ = db::update_provider_health(&database, &provider.id, "error", None);
        }
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::add_assistant_message(
        &database,
        &chat_id,
        &Uuid::new_v4().to_string(),
        &continuation,
    )?;
    db::record_usage(
        &database,
        &Uuid::new_v4().to_string(),
        &provider.id,
        &provider.model,
        completion.input_tokens,
        completion.output_tokens,
    )?;
    db::update_provider_health(
        &database,
        &provider.id,
        "connected",
        Some(completion.latency_ms),
    )?;
    Ok(())
}

#[tauri::command]
async fn send_chat_message(
    chat_id: String,
    content: String,
    generation_id: String,
    response_language: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let content = content.trim().to_owned();
    if content.is_empty() {
        return Err(CommandError::new(keys::MESSAGE_EMPTY));
    }

    fn persisted(error: CommandError) -> CommandError {
        error.with_variable("messagePersisted", "true")
    }

    let user_message_id = Uuid::new_v4().to_string();
    let (provider, full_history) = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::add_user_message(&database, &chat_id, &user_message_id, &content)?;
        (|| -> CommandResult<_> {
            let provider_id = db::chat_provider_id(&database, &chat_id)?;
            let provider = db::get_provider(&database, &provider_id)?;
            let history = db::messages_for_chat(&database, &chat_id)?;
            Ok((provider, history))
        })()
        .map_err(persisted)?
    };
    let prepared = prepare_generation_context(
        &state,
        &chat_id,
        &full_history,
        &provider,
        &content,
        response_language.as_deref(),
    )
    .await
    .map_err(persisted)?;
    let secret = secret_for_saved_provider(&provider).map_err(persisted)?;

    let cancellation = register_generation(&state, &generation_id).map_err(persisted)?;
    let completion = complete_cancellable(
        &provider,
        secret.as_deref(),
        &prepared.history,
        prepared.system_prompt.as_deref(),
        None,
        &prepared.retry,
        cancellation,
    )
    .await;
    finish_generation(&state, &generation_id);
    let completion = match completion {
        Ok(completion) => completion,
        Err(error) => {
            if error.key != keys::PROVIDER_REQUEST_CANCELLED {
                if let Ok(database) = state.database.lock() {
                    let _ = db::update_provider_health(&database, &provider.id, "error", None);
                }
            }
            return Err(persisted(error));
        }
    };

    let response_content = response_rules::normalize_response(&completion.content);
    if response_content.is_empty() {
        if let Ok(database) = state.database.lock() {
            let _ = db::update_provider_health(&database, &provider.id, "error", None);
        }
        return Err(persisted(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE)));
    }

    let database = state
        .database
        .lock()
        .map_err(|error| persisted(CommandError::internal(error)))?;
    db::add_assistant_message(
        &database,
        &chat_id,
        &Uuid::new_v4().to_string(),
        &response_content,
    )
    .map_err(persisted)?;
    db::record_usage(
        &database,
        &Uuid::new_v4().to_string(),
        &provider.id,
        &provider.model,
        completion.input_tokens,
        completion.output_tokens,
    )
    .map_err(persisted)?;
    db::update_provider_health(
        &database,
        &provider.id,
        "connected",
        Some(completion.latency_ms),
    )
    .map_err(persisted)?;
    Ok(())
}

#[tauri::command]
fn upsert_galaxy_item(
    input: GalaxyItemInput,
    state: State<'_, AppState>,
) -> CommandResult<GalaxyItem> {
    if input.name.trim().is_empty() {
        return Err(CommandError::new(keys::COMMON_NAME_REQUIRED));
    }
    let id = input
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let database = state.database.lock().map_err(CommandError::internal)?;
    Ok(db::upsert_galaxy_item(&database, &id, &input)?)
}

#[tauri::command]
fn import_galaxy_items(
    inputs: Vec<GalaxyItemInput>,
    state: State<'_, AppState>,
) -> CommandResult<usize> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    let transaction = database
        .unchecked_transaction()
        .map_err(CommandError::internal)?;
    for input in &inputs {
        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        db::upsert_galaxy_item(&transaction, &id, input)?;
    }
    transaction.commit().map_err(CommandError::internal)?;
    Ok(inputs.len())
}

#[tauri::command]
fn delete_galaxy_item(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::delete_galaxy_item(&database, &id)?;
    Ok(())
}

#[tauri::command]
async fn fetch_provider_models(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<ProviderModelResult> {
    let retry = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_settings(&database)?.ai_modules.retry
    };
    let secret = resolve_input_secret(&provider, api_key.as_deref())?;
    provider_client::list_models(&provider, secret.as_deref(), &retry).await
}

#[tauri::command]
async fn test_provider_embeddings(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<EmbeddingProbeResult> {
    validate_provider_input(&provider)?;
    let embedding_model = provider
        .embedding_model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| CommandError::new(keys::PROVIDER_EMBEDDING_MODEL_REQUIRED))?;
    let retry = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_settings(&database)?.ai_modules.retry
    };
    let secret = resolve_input_secret(&provider, api_key.as_deref())?;
    let id = provider
        .id
        .clone()
        .unwrap_or_else(|| "embedding-probe".to_owned());
    let mut saved = provider.into_provider(id, "disabled".into(), None);
    saved.embedding_model = Some(embedding_model);
    let result = provider_client::embed(
        &saved,
        secret.as_deref(),
        &["Galactrix semantic memory connection test".to_owned()],
        &retry,
    )
    .await?;
    let dimensions = result.embeddings.first().map_or(0, Vec::len);
    if dimensions == 0 {
        return Err(CommandError::new(keys::PROVIDER_EMPTY_RESPONSE));
    }
    Ok(EmbeddingProbeResult {
        dimensions,
        latency_ms: result.latency_ms,
    })
}

#[tauri::command]
async fn save_provider(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<Provider> {
    validate_provider_input(&provider)?;
    if provider.kind == "character-ai" {
        return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
    }

    let id = provider
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let supplied_secret = api_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let previous_provider = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::provider_optional(&database, &id)?
    };
    let previous_secret = if supplied_secret.is_some() || provider_requires_key(&provider.kind) {
        secure_storage::read_provider_secret(&id)?
    } else {
        secure_storage::read_provider_secret(&id).unwrap_or(None)
    };
    let effective_secret = supplied_secret.clone().or_else(|| previous_secret.clone());
    let retry = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_settings(&database)?.ai_modules.retry
    };

    let mut probe_input = provider.clone();
    probe_input.id = Some(id.clone());
    let probe = if provider_requires_key(&probe_input.kind) && effective_secret.is_none() {
        Err(CommandError::new(keys::PROVIDER_API_KEY_MISSING))
    } else {
        provider_client::list_models(&probe_input, effective_secret.as_deref(), &retry).await
    };
    let (status, latency_ms) = match probe {
        Ok(result) => ("connected".to_string(), Some(result.latency_ms)),
        Err(_) => ("disabled".to_string(), None),
    };

    let mut saved = provider.into_provider(id.clone(), status, latency_ms);
    saved.has_secret = effective_secret.is_some();
    {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::save_provider(&database, &saved)?;
    }

    if let Some(secret) = supplied_secret.as_deref() {
        if let Err(error) = secure_storage::save_provider_secret(&id, secret) {
            if let Ok(database) = state.database.lock() {
                if let Some(previous) = previous_provider.as_ref() {
                    let _ = db::save_provider(&database, previous);
                } else {
                    let _ = db::delete_provider_record(&database, &id);
                }
            }
            restore_provider_secret(&id, previous_secret.as_deref());
            return Err(error);
        }
    }

    saved.has_secret = secure_storage::has_provider_secret(&saved.id);
    Ok(saved)
}

#[tauri::command]
fn export_provider_secrets(
    provider_ids: Vec<String>,
    state: State<'_, AppState>,
) -> CommandResult<HashMap<String, String>> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    let mut secrets = HashMap::new();
    for id in provider_ids {
        db::get_provider(&database, &id)?;
        if let Some(secret) = secure_storage::read_provider_secret(&id)? {
            secrets.insert(id, secret);
        }
    }
    Ok(secrets)
}

fn restore_provider_secret(provider_id: &str, secret: Option<&str>) {
    match secret {
        Some(secret) => {
            let _ = secure_storage::save_provider_secret(provider_id, secret);
        }
        None => {
            let _ = secure_storage::delete_provider_secret(provider_id);
        }
    }
}

#[tauri::command]
fn import_providers(
    entries: Vec<ProviderImportInput>,
    state: State<'_, AppState>,
) -> CommandResult<usize> {
    for entry in &entries {
        validate_provider_input(&entry.provider)?;
        if entry.provider.kind == "character-ai" {
            return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
        }
    }

    let imported_count = entries.len();
    let mut prepared = Vec::with_capacity(imported_count);
    {
        let database = state.database.lock().map_err(CommandError::internal)?;
        for entry in entries {
            let id = entry
                .provider
                .id
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            let new_secret = entry
                .api_key
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
            let previous_secret = secure_storage::read_provider_secret(&id)?;
            let previous_provider = db::provider_optional(&database, &id)?;
            let mut provider = entry
                .provider
                .into_provider(id, "disabled".into(), None);
            provider.has_secret = new_secret.is_some()
                || previous_secret.is_some()
                || secure_storage::has_provider_secret(&provider.id);
            prepared.push((provider, new_secret, previous_provider, previous_secret));
        }

        let transaction = database
            .unchecked_transaction()
            .map_err(CommandError::internal)?;
        for (provider, _, _, _) in &prepared {
            db::save_provider(&transaction, provider)?;
        }
        transaction.commit().map_err(CommandError::internal)?;
    }

    for (provider, new_secret, _, _) in &prepared {
        let Some(new_secret) = new_secret.as_deref() else {
            continue;
        };
        if let Err(error) = secure_storage::save_provider_secret(&provider.id, new_secret) {
            if let Ok(database) = state.database.lock() {
                for (current, _, previous_provider, _) in &prepared {
                    if let Some(previous_provider) = previous_provider {
                        let _ = db::save_provider(&database, previous_provider);
                    } else {
                        let _ = db::delete_provider_record(&database, &current.id);
                    }
                }
            }
            for (current, _, _, previous_secret) in &prepared {
                restore_provider_secret(&current.id, previous_secret.as_deref());
            }
            return Err(error);
        }
    }

    Ok(imported_count)
}

#[tauri::command]
async fn check_provider(id: String, state: State<'_, AppState>) -> CommandResult<Provider> {
    let mut provider = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_provider(&database, &id)?
    };
    let input = provider_as_input(&provider);
    let retry = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_settings(&database)?.ai_modules.retry
    };
    let secret = match secret_for_saved_provider(&provider) {
        Ok(secret) => secret,
        Err(_) => {
            provider.status = "error".into();
            provider.latency_ms = None;
            provider.has_secret = false;
            let database = state.database.lock().map_err(CommandError::internal)?;
            db::update_provider_health(&database, &provider.id, "error", None)?;
            return Ok(provider);
        }
    };
    let probe = provider_client::list_models(&input, secret.as_deref(), &retry).await;

    match probe {
        Ok(result) => {
            provider.status = "connected".into();
            provider.latency_ms = Some(result.latency_ms);
        }
        Err(_) => {
            provider.status = "error".into();
            provider.latency_ms = None;
        }
    }
    provider.has_secret = secure_storage::has_provider_secret(&provider.id);

    let database = state.database.lock().map_err(CommandError::internal)?;
    db::update_provider_health(
        &database,
        &provider.id,
        &provider.status,
        provider.latency_ms,
    )?;
    Ok(provider)
}

#[tauri::command]
fn delete_provider(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_provider(&database, &id)?;
    }
    let previous_secret = secure_storage::read_provider_secret(&id)?;
    if previous_secret.is_some() {
        secure_storage::delete_provider_secret(&id)?;
    }

    let result = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::delete_provider(&database, &id)
    };
    if let Err(error) = result {
        restore_provider_secret(&id, previous_secret.as_deref());
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
fn update_app_settings(
    mut settings: AppSettings,
    state: State<'_, AppState>,
) -> CommandResult<AppSettings> {
    settings.profile_name = settings.profile_name.trim().to_string();
    if settings.profile_name.chars().count() > 80 {
        return Err(CommandError::new(keys::PROFILE_NAME_TOO_LONG));
    }
    settings.profile_avatar = settings.profile_avatar.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });
    if let Some(avatar) = settings.profile_avatar.as_deref() {
        if !avatar.starts_with("data:image/") {
            return Err(CommandError::new(keys::PROFILE_IMAGE_UNSUPPORTED));
        }
        if avatar.len() > 900_000 {
            return Err(CommandError::new(keys::PROFILE_IMAGE_TOO_LARGE));
        }
    }
    settings.interface_scale = settings.interface_scale.clamp(0.8, 1.5);
    settings.sidebar_width = settings.sidebar_width.clamp(196, 420);
    settings.chat_sidebar_width = settings.chat_sidebar_width.clamp(248, 560);
    if !matches!(settings.theme_mode.as_str(), "light" | "dark" | "system") {
        settings.theme_mode = "system".into();
    }
    if !matches!(
        settings.theme_variant.as_str(),
        "default" | "lavender" | "discord" | "spotify"
    ) {
        settings.theme_variant = "default".into();
    }
    if !matches!(settings.language.as_str(), "system" | "ru" | "en") {
        settings.language = "system".into();
    }
    if !matches!(
        settings.chat_view_mode.as_str(),
        "conversation" | "messenger"
    ) {
        settings.chat_view_mode = "conversation".into();
    }
    if !matches!(settings.response_language.as_str(), "app" | "auto") {
        settings.response_language = "app".into();
    }

    settings.ai_modules.retry.max_attempts =
        settings.ai_modules.retry.max_attempts.clamp(1, 8);
    settings.ai_modules.retry.initial_delay_ms =
        settings.ai_modules.retry.initial_delay_ms.clamp(100, 60_000);
    settings.ai_modules.retry.max_delay_ms = settings
        .ai_modules
        .retry
        .max_delay_ms
        .clamp(settings.ai_modules.retry.initial_delay_ms, 300_000);

    let dynamic = &mut settings.ai_modules.dynamic_context;
    if !matches!(dynamic.mode.as_str(), "local" | "provider" | "hybrid") {
        dynamic.mode = "hybrid".into();
    }
    dynamic.provider_id = dynamic.provider_id.take().and_then(|value| {
        let value = value.trim();
        (!value.is_empty()).then(|| value.to_owned())
    });
    dynamic.direct_message_limit = dynamic.direct_message_limit.clamp(8, 200);
    dynamic.summary_batch_size = dynamic.summary_batch_size.clamp(4, 100);
    dynamic.trigger_messages = dynamic
        .trigger_messages
        .clamp(dynamic.direct_message_limit.saturating_add(4), 500);
    dynamic.analysis_prompt = dynamic.analysis_prompt.trim().chars().take(12_000).collect();
    if dynamic.analysis_prompt.is_empty() {
        dynamic.analysis_prompt = models::DynamicContextSettings::default().analysis_prompt;
    }

    let semantic = &mut settings.ai_modules.semantic_memory;
    semantic.provider_id = semantic.provider_id.take().and_then(|value| {
        let value = value.trim();
        (!value.is_empty()).then(|| value.to_owned())
    });
    semantic.top_k = semantic.top_k.clamp(1, 32);
    semantic.similarity_threshold = semantic.similarity_threshold.clamp(0.0, 1.0);
    semantic.batch_size = semantic.batch_size.clamp(1, 64);
    semantic.archived_message_limit = semantic.archived_message_limit.clamp(20, 5_000);

    let database = state.database.lock().map_err(CommandError::internal)?;
    let provider_ids = db::provider_ids(&database)?;
    if dynamic
        .provider_id
        .as_ref()
        .is_some_and(|id| !provider_ids.contains(id))
    {
        dynamic.provider_id = None;
    }
    if semantic
        .provider_id
        .as_ref()
        .is_some_and(|id| !provider_ids.contains(id))
    {
        semantic.provider_id = None;
    }
    db::update_settings(&database, &settings)?;
    Ok(settings)
}

fn validate_provider_input(provider: &ProviderInput) -> CommandResult<()> {
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
    if !matches!(
        provider.kind.as_str(),
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
    ) {
        return Err(CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", &provider.kind));
    }
    Ok(())
}

fn provider_as_input(provider: &Provider) -> ProviderInput {
    ProviderInput {
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
    }
}

fn resolve_input_secret(
    provider: &ProviderInput,
    supplied: Option<&str>,
) -> CommandResult<Option<String>> {
    let secret = input_secret(provider, supplied)?;
    if provider_requires_key(&provider.kind) && secret.is_none() {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_REQUIRED));
    }
    Ok(secret)
}

fn input_secret(provider: &ProviderInput, supplied: Option<&str>) -> CommandResult<Option<String>> {
    if let Some(secret) = supplied
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(Some(secret.to_owned()));
    }
    let Some(provider_id) = provider.id.as_deref() else {
        return Ok(None);
    };
    if provider_requires_key(&provider.kind) {
        return secure_storage::read_provider_secret(provider_id);
    }
    Ok(secure_storage::read_provider_secret(provider_id).unwrap_or(None))
}

fn secret_for_saved_provider(provider: &Provider) -> CommandResult<Option<String>> {
    let secret = if provider_requires_key(&provider.kind) {
        secure_storage::read_provider_secret(&provider.id)?
    } else {
        secure_storage::read_provider_secret(&provider.id).unwrap_or(None)
    };
    if provider_requires_key(&provider.kind) && secret.is_none() {
        return Err(CommandError::new(keys::PROVIDER_API_KEY_NOT_IN_STORAGE));
    }
    Ok(secret)
}

fn provider_requires_key(kind: &str) -> bool {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(windows)]
            if let Some(window) = app.get_webview_window("main") {
                if let Err(error) = windows_window::install_keyboard_system_menu_guard(&window) {
                    eprintln!("Failed to install the Windows system menu guard: {error}");
                }
            }

            if let Err(error) = secure_storage::initialize() {
                eprintln!("Secure storage is unavailable: {error}");
            }

            let app_data_dir = app.path().app_local_data_dir().map_err(|error| {
                std::io::Error::other(format!("failed to resolve app data directory: {error}"))
            })?;
            std::fs::create_dir_all(&app_data_dir).map_err(|error| {
                std::io::Error::other(format!("failed to create app data directory: {error}"))
            })?;

            let database = db::open(&app_data_dir.join("galactrix.sqlite3")).map_err(|error| {
                std::io::Error::other(format!("failed to open local database: {error}"))
            })?;
            app.manage(AppState {
                database: Mutex::new(database),
                generations: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
            get_chat_state,
            cancel_generation,
            create_chat,
            update_chat_config,
            rename_chat,
            delete_chat,
            set_chat_pinned,
            clear_chat,
            clone_chat,
            branch_chat,
            edit_message,
            delete_message,
            delete_messages,
            set_message_remembered,
            select_message_variant,
            preview_prompt,
            regenerate_message,
            continue_message,
            send_chat_message,
            upsert_galaxy_item,
            import_galaxy_items,
            delete_galaxy_item,
            fetch_provider_models,
            test_provider_embeddings,
            save_provider,
            export_provider_secrets,
            import_providers,
            check_provider,
            delete_provider,
            update_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
