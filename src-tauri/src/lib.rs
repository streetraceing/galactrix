mod db;
mod i18n;
mod models;
mod prompt_builder;
mod provider_client;
mod response_rules;
mod secure_storage;

use std::{collections::HashMap, sync::Mutex};

use i18n::CommandResult;
use models::{
    AppSettings, AppSnapshot, ChatConfigInput, CreatedChat, GalaxyItem, GalaxyItemInput, Provider,
    PromptPreviewInput, PromptPreviewResult, ProviderImportInput, ProviderInput,
    ProviderModelResult,
};
use rusqlite::Connection;
use tauri::{Manager, State};
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

struct AppState {
    database: Mutex<Connection>,
}

#[tauri::command]
fn get_app_snapshot(state: State<'_, AppState>) -> CommandResult<AppSnapshot> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
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
        return Err("Название чата не может быть пустым".into());
    }

    let id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
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
    let database = state.database.lock().map_err(|error| error.to_string())?;
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
        return Err("Название чата не может быть пустым".into());
    }
    if title.chars().count() > 120 {
        return Err("Название чата слишком длинное".into());
    }
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::rename_chat(&database, &chat_id, title)?;
    Ok(())
}

#[tauri::command]
fn delete_chat(chat_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_chat(&database, &chat_id)?;
    Ok(())
}

#[tauri::command]
fn set_chat_pinned(
    chat_id: String,
    pinned: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::set_chat_pinned(&database, &chat_id, pinned)?;
    Ok(())
}

#[tauri::command]
fn clear_chat(chat_id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::clear_chat(&database, &chat_id)?;
    Ok(())
}

#[tauri::command]
fn clone_chat(
    chat_id: String,
    include_messages: bool,
    input: Option<ChatConfigInput>,
    state: State<'_, AppState>,
) -> CommandResult<CreatedChat> {
    let new_id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let mut title = db::clone_chat(&database, &chat_id, &new_id, include_messages, None)?;

    if let Some(input) = input {
        if let Err(error) = db::update_chat_config(&database, &new_id, &input) {
            let _ = db::delete_chat(&database, &new_id);
            return Err(error.into());
        }
        title = input.title.trim().to_owned();
    }

    Ok(CreatedChat { id: new_id, title })
}

#[tauri::command]
fn branch_chat(
    message_id: String,
    state: State<'_, AppState>,
) -> CommandResult<CreatedChat> {
    let new_id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let source_chat_id = database
        .query_row(
            "SELECT chat_id FROM messages WHERE id = ?1",
            rusqlite::params![message_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Сообщение не найдено".to_string())?;
    let title = db::clone_chat(
        &database,
        &source_chat_id,
        &new_id,
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
        return Err("Сообщение не может быть пустым".into());
    }
    let database = state.database.lock().map_err(|error| error.to_string())?;
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
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_message(&database, &message_id)?;
    Ok(())
}

#[tauri::command]
fn set_message_remembered(
    message_id: String,
    remembered: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::set_message_remembered(&database, &message_id, remembered)?;
    Ok(())
}

#[tauri::command]
fn select_message_variant(
    message_id: String,
    variant_index: i64,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::select_message_variant(&database, &message_id, variant_index)?;
    Ok(())
}

fn build_chat_system_prompt(
    database: &Connection,
    chat_id: &str,
    history: &[models::Message],
    response_language: Option<&str>,
) -> Result<Option<String>, String> {
    let context = db::get_chat_prompt_context(database, chat_id)?;
    Ok(prompt_builder::build_system_prompt(
        &context,
        history,
        response_language,
    ))
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
        .unwrap_or("Пользователь")
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
        .unwrap_or("Ассистент")
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
    response_language: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let (provider, history, system_prompt) = {
        let database = state.database.lock().map_err(|error| error.to_string())?;
        let (chat_id, history) = db::messages_before_message(&database, &message_id)?;
        if !matches!(history.last(), Some(message) if message.role == "user") {
            return Err("Перед ответом ассистента не найдено сообщение пользователя".into());
        }
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        let system_prompt = build_chat_system_prompt(
            &database,
            &chat_id,
            &history,
            response_language.as_deref(),
        )?;
        (
            db::get_provider(&database, &provider_id)?,
            history,
            system_prompt,
        )
    };
    let secret = secret_for_saved_provider(&provider)?;

    let completion = match provider_client::complete(
        &provider,
        secret.as_deref(),
        &history,
        system_prompt.as_deref(),
        None,
    )
    .await
    {
        Ok(completion) => completion,
        Err(error) => {
            if let Ok(database) = state.database.lock() {
                let _ = db::update_provider_health(&database, &provider.id, "error", None);
            }
            return Err(error.into());
        }
    };

    let response_content = response_rules::normalize_response(&completion.content);
    if response_content.is_empty() {
        return Err("Модель вернула пустой ответ".into());
    }

    let database = state.database.lock().map_err(|error| error.to_string())?;
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
async fn send_chat_message(
    chat_id: String,
    content: String,
    response_language: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let content = content.trim();
    if content.is_empty() {
        return Err("Пустое сообщение не отправляется".into());
    }

    let (provider, history, system_prompt) = {
        let database = state.database.lock().map_err(|error| error.to_string())?;
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        let history = db::messages_for_chat(&database, &chat_id)?;
        let system_prompt = build_chat_system_prompt(
            &database,
            &chat_id,
            &history,
            response_language.as_deref(),
        )?;
        (
            db::get_provider(&database, &provider_id)?,
            history,
            system_prompt,
        )
    };
    let secret = secret_for_saved_provider(&provider)?;

    let completion = match provider_client::complete(
        &provider,
        secret.as_deref(),
        &history,
        system_prompt.as_deref(),
        Some(content),
    )
    .await
    {
        Ok(completion) => completion,
        Err(error) => {
            if let Ok(database) = state.database.lock() {
                let _ = db::update_provider_health(&database, &provider.id, "error", None);
            }
            return Err(error.into());
        }
    };

    let response_content = response_rules::normalize_response(&completion.content);
    if response_content.is_empty() {
        return Err("Модель вернула пустой ответ".into());
    }

    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::add_exchange(
        &database,
        &chat_id,
        &Uuid::new_v4().to_string(),
        content,
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
fn upsert_galaxy_item(
    input: GalaxyItemInput,
    state: State<'_, AppState>,
) -> CommandResult<GalaxyItem> {
    if input.name.trim().is_empty() {
        return Err("Укажите название".into());
    }
    let id = input
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let database = state.database.lock().map_err(|error| error.to_string())?;
    Ok(db::upsert_galaxy_item(&database, &id, &input)?)
}

#[tauri::command]
fn import_galaxy_items(
    inputs: Vec<GalaxyItemInput>,
    state: State<'_, AppState>,
) -> CommandResult<usize> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let transaction = database
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    for input in &inputs {
        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        db::upsert_galaxy_item(&transaction, &id, input)?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(inputs.len())
}

#[tauri::command]
fn delete_galaxy_item(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_galaxy_item(&database, &id)?;
    Ok(())
}

#[tauri::command]
async fn fetch_provider_models(
    provider: ProviderInput,
    api_key: Option<String>,
) -> CommandResult<ProviderModelResult> {
    let secret = resolve_input_secret(&provider, api_key.as_deref())?;
    Ok(provider_client::list_models(&provider, secret.as_deref()).await?)
}

#[tauri::command]
async fn save_provider(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<Provider> {
    validate_provider_input(&provider)?;
    if provider.kind == "character-ai" {
        return Err(
            "Character.AI требует отдельного адаптера; подключение не было сохранено".into(),
        );
    }

    let id = provider
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    if let Some(secret) = api_key.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        secure_storage::save_provider_secret(&id, secret)?;
    }

    let mut probe_input = provider.clone();
    probe_input.id = Some(id.clone());
    let secret = input_secret(&probe_input, api_key.as_deref());
    let probe = if provider_requires_key(&probe_input.kind) && secret.is_none() {
        Err("API-ключ ещё не добавлен".into())
    } else {
        provider_client::list_models(&probe_input, secret.as_deref()).await
    };
    let (status, latency_ms) = match probe {
        Ok(result) => ("connected".to_string(), Some(result.latency_ms)),
        Err(_) => ("disabled".to_string(), None),
    };

    let mut saved = provider.into_provider(id, status, latency_ms);
    saved.has_secret = secure_storage::has_provider_secret(&saved.id);
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::save_provider(&database, &saved)?;
    Ok(saved)
}

#[tauri::command]
fn export_provider_secrets(
    provider_ids: Vec<String>,
    state: State<'_, AppState>,
) -> CommandResult<HashMap<String, String>> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let mut secrets = HashMap::new();
    for id in provider_ids {
        db::get_provider(&database, &id)?;
        if let Some(secret) = secure_storage::provider_secret(&id) {
            secrets.insert(id, secret);
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
        validate_provider_input(&entry.provider)?;
        if entry.provider.kind == "character-ai" {
            return Err("Character.AI нельзя импортировать без отдельного адаптера".into());
        }
    }

    let imported_count = entries.len();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let transaction = database
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    for entry in entries {
        let id = entry
            .provider
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        if let Some(secret) = entry
            .api_key
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            secure_storage::save_provider_secret(&id, secret)?;
        }
        let mut provider = entry
            .provider
            .into_provider(id, "disabled".into(), None);
        provider.has_secret = secure_storage::has_provider_secret(&provider.id);
        db::save_provider(&transaction, &provider)?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(imported_count)
}

#[tauri::command]
async fn check_provider(id: String, state: State<'_, AppState>) -> CommandResult<Provider> {
    let mut provider = {
        let database = state.database.lock().map_err(|error| error.to_string())?;
        db::get_provider(&database, &id)?
    };
    let input = provider_as_input(&provider);
    let secret = match secret_for_saved_provider(&provider) {
        Ok(secret) => secret,
        Err(_) => {
            provider.status = "error".into();
            provider.latency_ms = None;
            provider.has_secret = false;
            let database = state.database.lock().map_err(|error| error.to_string())?;
            db::update_provider_health(&database, &provider.id, "error", None)?;
            return Ok(provider);
        }
    };
    let probe = provider_client::list_models(&input, secret.as_deref()).await;

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

    let database = state.database.lock().map_err(|error| error.to_string())?;
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
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_provider(&database, &id)?;
    drop(database);
    let _ = secure_storage::delete_provider_secret(&id);
    Ok(())
}

#[tauri::command]
fn update_app_settings(
    mut settings: AppSettings,
    state: State<'_, AppState>,
) -> CommandResult<AppSettings> {
    settings.profile_name = settings.profile_name.trim().to_string();
    if settings.profile_name.is_empty() {
        settings.profile_name = "Вы".into();
    }
    if settings.profile_name.chars().count() > 80 {
        return Err("Имя профиля слишком длинное".into());
    }
    settings.profile_avatar = settings.profile_avatar.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });
    if let Some(avatar) = settings.profile_avatar.as_deref() {
        if !avatar.starts_with("data:image/") {
            return Err("Неподдерживаемый формат изображения профиля".into());
        }
        if avatar.len() > 900_000 {
            return Err("Изображение профиля слишком большое".into());
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

    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::update_settings(&database, &settings)?;
    Ok(settings)
}

fn validate_provider_input(provider: &ProviderInput) -> Result<(), String> {
    if provider.name.trim().is_empty() {
        return Err("Укажите название подключения".into());
    }
    if provider.model.trim().is_empty() {
        return Err("Укажите модель".into());
    }
    if !(0.0..=2.0).contains(&provider.temperature) {
        return Err("Temperature должна быть от 0 до 2".into());
    }
    if !(0.0..=1.0).contains(&provider.top_p) {
        return Err("Top P должна быть от 0 до 1".into());
    }
    if provider.max_tokens <= 0 {
        return Err("Max tokens должно быть больше нуля".into());
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
        return Err("Неизвестный тип провайдера".into());
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
    }
}

fn resolve_input_secret(
    provider: &ProviderInput,
    supplied: Option<&str>,
) -> Result<Option<String>, String> {
    let secret = input_secret(provider, supplied);
    if provider_requires_key(&provider.kind) && secret.is_none() {
        return Err("Для этого провайдера нужен API-ключ".into());
    }
    Ok(secret)
}

fn input_secret(provider: &ProviderInput, supplied: Option<&str>) -> Option<String> {
    supplied
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            provider
                .id
                .as_deref()
                .and_then(secure_storage::provider_secret)
        })
}

fn secret_for_saved_provider(provider: &Provider) -> Result<Option<String>, String> {
    let secret = secure_storage::provider_secret(&provider.id);
    if provider_requires_key(&provider.kind) && secret.is_none() {
        return Err("API-ключ подключения не найден в защищённом хранилище".into());
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
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
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
            set_message_remembered,
            select_message_variant,
            preview_prompt,
            regenerate_message,
            send_chat_message,
            upsert_galaxy_item,
            import_galaxy_items,
            delete_galaxy_item,
            fetch_provider_models,
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
