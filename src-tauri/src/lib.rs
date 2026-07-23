mod db;
mod models;
mod secure_storage;

use std::sync::Mutex;

use models::{AppSettings, AppSnapshot, CreatedChat, GalaxyItem, Provider};
use rusqlite::Connection;
use tauri::{Manager, State};
use uuid::Uuid;

struct AppState {
    database: Mutex<Connection>,
}

#[tauri::command]
fn get_app_snapshot(state: State<'_, AppState>) -> Result<AppSnapshot, String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::snapshot(&database)
}

#[tauri::command]
fn create_chat(title: String, state: State<'_, AppState>) -> Result<CreatedChat, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("Название чата не может быть пустым".into());
    }

    let id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::create_chat(&database, &id, title)?;
    Ok(CreatedChat { id, title: title.into() })
}

#[tauri::command]
fn add_message(
    chat_id: String,
    role: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if !matches!(role.as_str(), "user" | "assistant" | "system") {
        return Err("Недопустимая роль сообщения".into());
    }
    if content.trim().is_empty() {
        return Err("Пустое сообщение не сохраняется".into());
    }

    let id = Uuid::new_v4().to_string();
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::add_message(&database, &id, &chat_id, &role, content.trim())?;
    Ok(id)
}

#[tauri::command]
fn save_galaxy_item(item: GalaxyItem, state: State<'_, AppState>) -> Result<GalaxyItem, String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::save_galaxy_item(&database, &item)?;
    Ok(item)
}

#[tauri::command]
fn save_provider(
    provider: Provider,
    api_key: Option<String>,
    state: State<'_, AppState>,
) -> Result<Provider, String> {
    if let Some(secret) = api_key.as_deref().map(str::trim).filter(|secret| !secret.is_empty()) {
        secure_storage::save_provider_secret(&provider.id, secret)?;
    }

    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::save_provider(&database, &provider)?;
    Ok(provider)
}

#[tauri::command]
fn update_app_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let database = state.database.lock().map_err(|error| error.to_string())?;
    db::update_settings(&database, &settings)?;
    Ok(settings)
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
            app.manage(AppState {
                database: Mutex::new(database),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
            create_chat,
            add_message,
            save_galaxy_item,
            save_provider,
            update_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
