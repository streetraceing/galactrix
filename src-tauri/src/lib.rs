mod db;
mod models;
mod prompt_builder;
mod provider_client;
mod response_presets;
mod secure_storage;

use std::sync::Mutex;

use models::{
    AppSettings, AppSnapshot, ChatConfigInput, CreatedChat, GalaxyItem, GalaxyItemInput, Provider,
    ProviderInput, ProviderModelResult,
};
use rusqlite::Connection;
use tauri::{Manager, State};
use uuid::Uuid;

struct AppState {
    database: Mutex<Connection>,
}

#[tauri::command]
fn get_app_snapshot(state: State<'_, AppState>) -> Result<AppSnapshot, String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let mut snapshot = db::snapshot(&database, env!("CARGO_PKG_VERSION"))?;
    for provider in &mut snapshot.providers {
        provider.has_secret = secure_storage::has_provider_secret(&provider.id);
    }
    Ok(snapshot)
}

#[tauri::command]
fn create_chat(input: ChatConfigInput, state: State<'_, AppState>) -> Result<CreatedChat, String> {
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
) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::update_chat_config(&database, &chat_id, &input)
}

#[tauri::command]
fn rename_chat(
    chat_id: String,
    title: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("Название чата не может быть пустым".into());
    }
    if title.chars().count() > 120 {
        return Err("Название чата слишком длинное".into());
    }
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::rename_chat(&database, &chat_id, title)
}

#[tauri::command]
fn delete_chat(chat_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_chat(&database, &chat_id)
}

#[tauri::command]
fn set_chat_pinned(
    chat_id: String,
    pinned: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::set_chat_pinned(&database, &chat_id, pinned)
}

#[tauri::command]
fn clear_chat(chat_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::clear_chat(&database, &chat_id)
}

#[tauri::command]
fn clone_chat(
    chat_id: String,
    include_messages: bool,
    input: Option<ChatConfigInput>,
    state: State<'_, AppState>,
) -> Result<CreatedChat, String> {
    let new_id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    let mut title = db::clone_chat(&database, &chat_id, &new_id, include_messages, None)?;

    if let Some(input) = input {
        if let Err(error) = db::update_chat_config(&database, &new_id, &input) {
            let _ = db::delete_chat(&database, &new_id);
            return Err(error);
        }
        title = input.title.trim().to_owned();
    }

    Ok(CreatedChat { id: new_id, title })
}

#[tauri::command]
fn branch_chat(
    message_id: String,
    state: State<'_, AppState>,
) -> Result<CreatedChat, String> {
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
) -> Result<(), String> {
    let content = content.trim();
    if content.is_empty() {
        return Err("Сообщение не может быть пустым".into());
    }
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::edit_message(&database, &message_id, content)
}

#[tauri::command]
fn delete_message(message_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_message(&database, &message_id)
}

#[tauri::command]
fn set_message_remembered(
    message_id: String,
    remembered: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::set_message_remembered(&database, &message_id, remembered)
}

#[tauri::command]
async fn send_chat_message(
    chat_id: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let content = content.trim();
    if content.is_empty() {
        return Err("Пустое сообщение не отправляется".into());
    }

    let (provider, history, system_prompt, response_preset) = {
        let database = state.database.lock().map_err(|error| error.to_string())?;
        let context = db::get_chat_prompt_context(&database, &chat_id)?;
        let provider_id = db::chat_provider_id(&database, &chat_id)?;
        let history = db::messages_for_chat(&database, &chat_id)?;
        let response_preset = db::chat_response_preset(&database, &chat_id)?;
        let remembered = history
            .iter()
            .filter(|message| message.remembered)
            .map(|message| format!("- {}: {}", message.role, message.content.trim()))
            .collect::<Vec<_>>();
        let mut blocks = prompt_builder::build_system_prompt(&context)
            .into_iter()
            .collect::<Vec<_>>();
        if let Some(instructions) = response_presets::instructions(&response_preset) {
            blocks.push(format!("[RESPONSE PRESET]\n{instructions}"));
        }
        if !remembered.is_empty() {
            blocks.push(format!(
                "[REMEMBERED MESSAGES]\nTreat these marked messages as important persistent facts:\n{}",
                remembered.join("\n")
            ));
        }
        (
            db::get_provider(&database, &provider_id)?,
            history,
            (!blocks.is_empty()).then(|| blocks.join("\n\n")),
            response_preset,
        )
    };
    let secret = secret_for_saved_provider(&provider)?;

    let completion = match provider_client::complete(
        &provider,
        secret.as_deref(),
        &history,
        system_prompt.as_deref(),
        content,
    )
    .await
    {
        Ok(completion) => completion,
        Err(error) => {
            if let Ok(database) = state.database.lock() {
                let _ = db::update_provider_health(&database, &provider.id, "error", None);
            }
            return Err(error);
        }
    };

    let response_content = response_presets::apply(&response_preset, &completion.content);
    if response_content.is_empty() {
        return Err("Ответ модели стал пустым после применения пресета".into());
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
) -> Result<GalaxyItem, String> {
    if input.name.trim().is_empty() {
        return Err("Укажите название".into());
    }
    let id = input
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::upsert_galaxy_item(&database, &id, &input)
}

#[tauri::command]
fn delete_galaxy_item(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::delete_galaxy_item(&database, &id)
}

#[tauri::command]
async fn fetch_provider_models(
    provider: ProviderInput,
    api_key: Option<String>,
) -> Result<ProviderModelResult, String> {
    let secret = resolve_input_secret(&provider, api_key.as_deref())?;
    provider_client::list_models(&provider, secret.as_deref()).await
}

#[tauri::command]
async fn save_provider(
    provider: ProviderInput,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> Result<Provider, String> {
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
    let secret = resolve_input_secret(&probe_input, api_key.as_deref())?;
    let probe = provider_client::list_models(&probe_input, secret.as_deref()).await;
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
async fn check_provider(id: String, state: State<'_, AppState>) -> Result<Provider, String> {
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
fn delete_provider(id: String, state: State<'_, AppState>) -> Result<(), String> {
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
) -> Result<AppSettings, String> {
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
    let secret = supplied
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            provider
                .id
                .as_deref()
                .and_then(secure_storage::provider_secret)
        });
    if provider_requires_key(&provider.kind) && secret.is_none() {
        return Err("Для этого провайдера нужен API-ключ".into());
    }
    Ok(secret)
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
        "mistral" | "character-ai" | "cerebras" | "nvidia-nim" | "cloudflare-workers-ai"
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            secure_storage::initialize().map_err(|error| {
                std::io::Error::other(format!("failed to initialize secure storage: {error}"))
            })?;

            let app_data_dir = app.path().app_local_data_dir().map_err(|error| {
                std::io::Error::other(format!("failed to resolve app data directory: {error}"))
            })?;
            std::fs::create_dir_all(&app_data_dir).map_err(|error| {
                std::io::Error::other(format!("failed to create app data directory: {error}"))
            })?;

            let database = db::open(&app_data_dir.join("galactrix.sqlite3")).map_err(|error| {
                std::io::Error::other(format!("failed to open local database: {error}"))
            })?;
            let _ = secure_storage::delete_provider_secret("provider-1");
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
            send_chat_message,
            upsert_galaxy_item,
            delete_galaxy_item,
            fetch_provider_models,
            save_provider,
            check_provider,
            delete_provider,
            update_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
