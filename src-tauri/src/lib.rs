mod ai_context;
mod app_settings;
mod db;
mod dynamic_context;
mod generation_context;
mod generation_modules;
mod i18n;
mod models;
mod prompt_builder;
mod prompt_preview;
mod provider_client;
mod provider_support;
mod response_rules;
mod runtime;
mod secure_storage;
mod semantic_memory;
#[cfg(windows)]
mod windows_window;

use std::collections::HashMap;

use i18n::{keys, CommandError, CommandResult};
use models::{
    AppSettings, AppSnapshot, ChatConfigInput, ChatState, CreatedChat, EmbeddingProbeResult,
    GalaxyItem, GalaxyItemInput, PromptPreviewInput, PromptPreviewResult, Provider,
    ProviderImportInput, ProviderInput, ProviderModelResult, UsagePoint,
};
use tauri::{Manager, State};
use uuid::Uuid;

use runtime::{complete_cancellable, AppState};

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

#[tauri::command]
fn cancel_generation(generation_id: String, state: State<'_, AppState>) -> CommandResult<bool> {
    state.cancel_generation(generation_id)
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
fn get_usage_history(state: State<'_, AppState>) -> CommandResult<Vec<UsagePoint>> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::usage_history(&database)
}

#[tauri::command]
fn create_chat(input: ChatConfigInput, state: State<'_, AppState>) -> CommandResult<CreatedChat> {
    let id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(CommandError::internal)?;
    let title = db::create_chat(&database, &id, &input)?;
    Ok(CreatedChat { id, title })
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
fn rename_chat(chat_id: String, title: String, state: State<'_, AppState>) -> CommandResult<()> {
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
fn set_chat_pinned(chat_id: String, pinned: bool, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::set_chat_pinned(&database, &chat_id, pinned)?;
    Ok(())
}

#[tauri::command]
fn set_chat_archived(
    chat_id: String,
    archived: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::set_chat_archived(&database, &chat_id, archived)?;
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
    let resolved_title = db::clone_chat(
        &database,
        &chat_id,
        &new_id,
        &requested_title,
        include_messages,
        None,
    )?;

    if let Some(mut input) = input {
        input.title = resolved_title.clone();
        if let Err(error) = db::update_chat_config(&database, &new_id, &input) {
            let _ = db::delete_chat(&database, &new_id);
            return Err(error);
        }
    }

    Ok(CreatedChat {
        id: new_id,
        title: resolved_title,
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
    db::edit_message(&database, &message_id, &Uuid::new_v4().to_string(), content)?;
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
fn rewind_chat_to_message(message_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    db::rewind_chat_to_message(&database, &message_id)?;
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

#[tauri::command]
fn preview_prompt(input: PromptPreviewInput) -> PromptPreviewResult {
    prompt_preview::build(input)
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
        db::ensure_message_chat_mutable(&database, &message_id)?;
        let (chat_id, history) = db::messages_before_message(&database, &message_id)?;
        let regeneration_mode =
            response_rules::regeneration_mode(history.last().map(|message| message.role.as_str()))
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
    let prepared = generation_context::prepare(
        &state,
        &chat_id,
        &full_history,
        &provider,
        query_text,
        response_language.as_deref(),
    )
    .await?;
    let secret = provider_support::saved_secret(&provider)?;
    let cancellation = state.register_generation(&generation_id)?;
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
    state.finish_generation(&generation_id);
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

    let response_content = response_rules::normalize_response_with_cleanup(
        &completion.content,
        &prepared.response_cleanup,
    );
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
        false,
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
        db::ensure_message_chat_mutable(&database, &message_id)?;
        let (chat_id, history) = db::messages_through_message(&database, &message_id)?;
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        (chat_id, db::get_provider(&database, &provider_id)?, history)
    };
    let instruction = response_rules::continuation_instruction(response_language.as_deref());
    let query_text = full_history
        .last()
        .map(|message| message.content.as_str())
        .unwrap_or(instruction);
    let prepared = generation_context::prepare(
        &state,
        &chat_id,
        &full_history,
        &provider,
        query_text,
        response_language.as_deref(),
    )
    .await?;
    let secret = provider_support::saved_secret(&provider)?;
    let cancellation = state.register_generation(&generation_id)?;
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
    state.finish_generation(&generation_id);
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

    let continuation = response_rules::normalize_response_with_cleanup(
        &completion.content,
        &prepared.response_cleanup,
    );
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
    user_message_id: Option<String>,
    assistant_message_id: Option<String>,
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

    let user_message_id = user_message_id
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let mut assistant_message_id = assistant_message_id
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    if assistant_message_id == user_message_id {
        assistant_message_id = Uuid::new_v4().to_string();
    }
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
    let prepared = generation_context::prepare(
        &state,
        &chat_id,
        &full_history,
        &provider,
        &content,
        response_language.as_deref(),
    )
    .await
    .map_err(persisted)?;
    let secret = provider_support::saved_secret(&provider).map_err(persisted)?;

    let cancellation = state
        .register_generation(&generation_id)
        .map_err(persisted)?;
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
    state.finish_generation(&generation_id);
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

    let response_content = response_rules::normalize_response_with_cleanup(
        &completion.content,
        &prepared.response_cleanup,
    );
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
        &assistant_message_id,
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
    db::upsert_galaxy_item(&database, &id, &input)
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
    let secret = provider_support::resolve_input_secret(&provider, api_key.as_deref())?;
    provider_client::list_models(&provider, secret.as_deref(), &retry).await
}

#[tauri::command]
async fn test_provider_embeddings(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<EmbeddingProbeResult> {
    provider_support::validate_input(&provider)?;
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
    let secret = provider_support::resolve_input_secret(&provider, api_key.as_deref())?;
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
    provider_support::validate_input(&provider)?;
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
    let previous_secret =
        if supplied_secret.is_some() || provider_support::requires_key(&provider.kind) {
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
    let probe = if provider_support::requires_key(&probe_input.kind) && effective_secret.is_none() {
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
            provider_support::restore_secret(&id, previous_secret.as_deref());
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
) -> CommandResult<HashMap<String, Vec<String>>> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    let mut secrets = HashMap::new();
    for id in provider_ids {
        db::get_provider(&database, &id)?;
        if let Some(secret) = secure_storage::read_provider_secret(&id)? {
            let keys = secret
                .lines()
                .map(str::trim)
                .filter(|key| !key.is_empty())
                .map(str::to_owned)
                .collect::<Vec<_>>();
            if !keys.is_empty() {
                secrets.insert(id, keys);
            }
        }
    }
    Ok(secrets)
}

#[tauri::command]
fn import_providers(
    entries: Vec<ProviderImportInput>,
    state: State<'_, AppState>,
) -> CommandResult<usize> {
    for entry in &entries {
        provider_support::validate_input(&entry.provider)?;
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
            let new_secret = entry.normalized_secret();
            let previous_secret = secure_storage::read_provider_secret(&id)?;
            let previous_provider = db::provider_optional(&database, &id)?;
            let mut provider = entry.provider.into_provider(id, "disabled".into(), None);
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
                provider_support::restore_secret(&current.id, previous_secret.as_deref());
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
    let input = ProviderInput::from(&provider);
    let retry = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        db::get_settings(&database)?.ai_modules.retry
    };
    let secret = match provider_support::saved_secret(&provider) {
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
        provider_support::restore_secret(&id, previous_secret.as_deref());
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
fn update_app_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> CommandResult<AppSettings> {
    let database = state.database.lock().map_err(CommandError::internal)?;
    let provider_ids = db::provider_ids(&database)?;
    let settings = app_settings::normalize(settings, &provider_ids)?;
    db::update_settings(&database, &settings)?;
    Ok(settings)
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
            app.manage(AppState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
            get_usage_history,
            get_chat_state,
            cancel_generation,
            create_chat,
            update_chat_config,
            rename_chat,
            delete_chat,
            set_chat_pinned,
            set_chat_archived,
            clear_chat,
            clone_chat,
            branch_chat,
            edit_message,
            delete_message,
            delete_messages,
            rewind_chat_to_message,
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
