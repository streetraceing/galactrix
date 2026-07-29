use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::models::{
    AppSettings, AppSnapshot, Chat, ChatConfigInput, ChatPromptContext, GalaxyItem,
    GalaxyItemInput, Message, MessageVariant, Provider, UsagePoint,
};

pub fn open(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| error.to_string())?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| error.to_string())?;
    migrate(&connection)?;
    remove_legacy_preview_data(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                preview TEXT NOT NULL DEFAULT '',
                updated_at INTEGER NOT NULL,
                message_count INTEGER NOT NULL DEFAULT 0,
                pinned INTEGER NOT NULL DEFAULT 0,
                provider_id TEXT,
                persona_id TEXT,
                character_id TEXT,
                universe_id TEXT,
                response_preset TEXT NOT NULL DEFAULT 'natural'
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                remembered INTEGER NOT NULL DEFAULT 0,
                active_variant_index INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_messages_chat_created
                ON messages(chat_id, created_at);

            CREATE TABLE IF NOT EXISTS message_variants (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                position INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE(message_id, position),
                FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_message_variants_message_position
                ON message_variants(message_id, position);

            CREATE TABLE IF NOT EXISTS galaxy_items (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                data_json TEXT NOT NULL DEFAULT '{}',
                badge TEXT NOT NULL DEFAULT '',
                accent TEXT NOT NULL DEFAULT 'neutral',
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_worldbooks (
                chat_id TEXT NOT NULL,
                worldbook_id TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(chat_id, worldbook_id),
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
                FOREIGN KEY(worldbook_id) REFERENCES galaxy_items(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_chat_worldbooks_chat
                ON chat_worldbooks(chat_id, position);

            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'disabled',
                base_url TEXT,
                account_id TEXT,
                latency_ms INTEGER,
                temperature REAL NOT NULL DEFAULT 0.7,
                top_p REAL NOT NULL DEFAULT 0.95,
                max_tokens INTEGER NOT NULL DEFAULT 4096,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                profile_name TEXT NOT NULL DEFAULT 'Вы',
                profile_avatar TEXT,
                animations INTEGER NOT NULL DEFAULT 1,
                haptics INTEGER NOT NULL DEFAULT 1,
                compact_mode INTEGER NOT NULL DEFAULT 0,
                send_on_enter INTEGER NOT NULL DEFAULT 1,
                save_drafts INTEGER NOT NULL DEFAULT 1,
                interface_scale REAL NOT NULL DEFAULT 1.0,
                sidebar_width INTEGER NOT NULL DEFAULT 248,
                chat_sidebar_width INTEGER NOT NULL DEFAULT 320,
                sidebar_collapsed INTEGER NOT NULL DEFAULT 0,
                theme_mode TEXT NOT NULL DEFAULT 'system',
                theme_variant TEXT NOT NULL DEFAULT 'default'
            );

            CREATE TABLE IF NOT EXISTS usage_events (
                id TEXT PRIMARY KEY,
                provider_id TEXT,
                model TEXT NOT NULL,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                request_count INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE SET NULL
            );

            INSERT OR IGNORE INTO app_settings (id) VALUES (1);
            "#,
        )
        .map_err(|error| error.to_string())?;

    ensure_column(connection, "chats", "provider_id", "TEXT")?;
    ensure_column(connection, "chats", "persona_id", "TEXT")?;
    ensure_column(connection, "chats", "character_id", "TEXT")?;
    ensure_column(connection, "chats", "universe_id", "TEXT")?;
    ensure_column(
        connection,
        "chats",
        "response_preset",
        "TEXT NOT NULL DEFAULT 'natural'",
    )?;
    ensure_column(
        connection,
        "messages",
        "remembered",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "profile_name",
        "TEXT NOT NULL DEFAULT 'Вы'",
    )?;
    ensure_column(connection, "app_settings", "profile_avatar", "TEXT")?;
    ensure_column(
        connection,
        "messages",
        "active_variant_index",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(connection, "galaxy_items", "data_json", "TEXT NOT NULL DEFAULT '{}'")?;
    ensure_column(
        connection,
        "providers",
        "temperature",
        "REAL NOT NULL DEFAULT 0.7",
    )?;
    ensure_column(
        connection,
        "providers",
        "top_p",
        "REAL NOT NULL DEFAULT 0.95",
    )?;
    ensure_column(
        connection,
        "providers",
        "max_tokens",
        "INTEGER NOT NULL DEFAULT 4096",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "interface_scale",
        "REAL NOT NULL DEFAULT 1.0",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "sidebar_width",
        "INTEGER NOT NULL DEFAULT 248",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "chat_sidebar_width",
        "INTEGER NOT NULL DEFAULT 320",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "sidebar_collapsed",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "theme_mode",
        "TEXT NOT NULL DEFAULT 'system'",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "theme_variant",
        "TEXT NOT NULL DEFAULT 'default'",
    )?;
    connection
        .execute_batch(
            r#"
            INSERT OR IGNORE INTO message_variants (id, message_id, position, content, created_at)
            SELECT id || '-variant-0', id, 0, content, created_at
            FROM messages
            WHERE role = 'assistant';
            "#,
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|error| error.to_string())?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);
    if !columns.iter().any(|name| name == column) {
        connection
            .execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn remove_legacy_preview_data(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            DELETE FROM messages
            WHERE id IN ('message-1', 'message-2', 'message-3')
              AND chat_id = 'chat-1';

            DELETE FROM chats
            WHERE id = 'chat-1'
              AND title = 'Город под стеклянным небом';

            DELETE FROM galaxy_items
            WHERE id IN ('galaxy-1', 'galaxy-2', 'galaxy-3', 'galaxy-4')
              AND name IN ('Наблюдатель', 'Лира Вейл', 'Стеклянное небо', 'Фракции и технологии');

            UPDATE chats SET provider_id = NULL WHERE provider_id = 'provider-1';
            DELETE FROM providers
            WHERE id = 'provider-1'
              AND name = 'Mistral'
              AND model = 'mistral-large-latest';
            "#,
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn snapshot(connection: &Connection, app_version: &str) -> Result<AppSnapshot, String> {
    Ok(AppSnapshot {
        chats: list_chats(connection)?,
        messages: list_messages(connection)?,
        galaxy_items: list_galaxy_items(connection)?,
        providers: list_providers(connection)?,
        settings: get_settings(connection)?,
        usage: usage_history(connection)?,
        app_version: app_version.to_owned(),
    })
}

fn list_chats(connection: &Connection) -> Result<Vec<Chat>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, title, preview, updated_at, message_count, pinned, provider_id,
                    persona_id, character_id, universe_id, response_preset
             FROM chats ORDER BY pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, String>(10)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);

    rows.into_iter()
        .map(|(id, title, preview, updated_at, message_count, pinned, provider_id, persona_id, character_id, universe_id, response_preset)| {
            Ok(Chat {
                worldbook_ids: worldbook_ids_for_chat(connection, &id)?,
                id,
                title,
                preview,
                updated_at: relative_time(updated_at),
                message_count,
                pinned,
                provider_id,
                persona_id,
                character_id,
                universe_id,
                response_preset,
            })
        })
        .collect()
}

fn worldbook_ids_for_chat(connection: &Connection, chat_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "SELECT worldbook_id FROM chat_worldbooks WHERE chat_id = ?1 ORDER BY position ASC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map(params![chat_id], |row| row.get(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn message_variants_for_message(
    connection: &Connection,
    message_id: &str,
) -> Result<Vec<MessageVariant>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, position, content, created_at
             FROM message_variants WHERE message_id = ?1 ORDER BY position ASC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map(params![message_id], |row| {
            Ok(MessageVariant {
                id: row.get(0)?,
                index: row.get(1)?,
                content: row.get(2)?,
                created_at: clock_time(row.get(3)?),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn list_messages(connection: &Connection) -> Result<Vec<Message>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
             FROM messages ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);

    rows.into_iter()
        .map(|(id, chat_id, role, content, created_at, remembered, active_variant_index)| {
            let variants = if role == "assistant" {
                message_variants_for_message(connection, &id)?
            } else {
                Vec::new()
            };
            Ok(Message {
                id,
                chat_id,
                role,
                content,
                created_at: clock_time(created_at),
                remembered,
                active_variant_index,
                variants,
            })
        })
        .collect()
}

fn list_galaxy_items(connection: &Connection) -> Result<Vec<GalaxyItem>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, kind, name, description, data_json, badge, accent, updated_at
             FROM galaxy_items ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([], |row| {
            let data_json: String = row.get(4)?;
            Ok(GalaxyItem {
                id: row.get(0)?,
                kind: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                data: serde_json::from_str(&data_json).unwrap_or(Value::Object(Default::default())),
                badge: row.get(5)?,
                accent: row.get(6)?,
                updated_at: relative_time(row.get(7)?),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn list_providers(connection: &Connection) -> Result<Vec<Provider>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens
             FROM providers ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([], |row| {
            Ok(Provider {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                model: row.get(3)?,
                status: row.get(4)?,
                base_url: row.get(5)?,
                account_id: row.get(6)?,
                latency_ms: row.get(7)?,
                temperature: row.get(8)?,
                top_p: row.get(9)?,
                max_tokens: row.get(10)?,
                has_secret: false,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn get_settings(connection: &Connection) -> Result<AppSettings, String> {
    connection
        .query_row(
            "SELECT profile_name, profile_avatar, animations, haptics,
                    compact_mode, send_on_enter, save_drafts,
                    interface_scale, sidebar_width, chat_sidebar_width,
                    sidebar_collapsed, theme_mode, theme_variant
             FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    profile_name: row.get(0)?,
                    profile_avatar: row.get(1)?,
                    animations: row.get::<_, i64>(2)? != 0,
                    haptics: row.get::<_, i64>(3)? != 0,
                    compact_mode: row.get::<_, i64>(4)? != 0,
                    send_on_enter: row.get::<_, i64>(5)? != 0,
                    save_drafts: row.get::<_, i64>(6)? != 0,
                    interface_scale: row.get(7)?,
                    sidebar_width: row.get(8)?,
                    chat_sidebar_width: row.get(9)?,
                    sidebar_collapsed: row.get::<_, i64>(10)? != 0,
                    theme_mode: row.get(11)?,
                    theme_variant: row.get(12)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn usage_history(connection: &Connection) -> Result<Vec<UsagePoint>, String> {
    const DAY_SECONDS: i64 = 86_400;
    const LABELS: [&str; 7] = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

    let today = now_unix().div_euclid(DAY_SECONDS);
    let mut points = Vec::with_capacity(14);
    for offset in (0..14).rev() {
        let day = today - offset;
        let start = day * DAY_SECONDS;
        let end = start + DAY_SECONDS;
        let (input_tokens, output_tokens, requests) = connection
            .query_row(
                "SELECT COALESCE(SUM(input_tokens), 0),
                        COALESCE(SUM(output_tokens), 0),
                        COALESCE(SUM(request_count), 0)
                 FROM usage_events WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|error| error.to_string())?;
        let weekday = (day + 3).rem_euclid(7) as usize;
        points.push(UsagePoint {
            day,
            label: LABELS[weekday].into(),
            input_tokens,
            output_tokens,
            tokens: input_tokens + output_tokens,
            requests,
        });
    }
    Ok(points)
}

pub fn create_chat(
    connection: &Connection,
    id: &str,
    input: &ChatConfigInput,
) -> Result<(), String> {
    validate_chat_links(connection, input)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO chats (
                id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, universe_id, response_preset
             ) VALUES (?1, ?2, '', ?3, 0, 0, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                input.title.trim(),
                now_unix(),
                input.provider_id,
                input.persona_id,
                input.character_id,
                input.universe_id,
                input.response_preset,
            ],
        )
        .map_err(|error| error.to_string())?;
    replace_chat_worldbooks(&transaction, id, &input.worldbook_ids)?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn update_chat_config(
    connection: &Connection,
    chat_id: &str,
    input: &ChatConfigInput,
) -> Result<(), String> {
    validate_chat_links(connection, input)?;
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE chats SET title = ?1, provider_id = ?2, persona_id = ?3,
                    character_id = ?4, universe_id = ?5, response_preset = ?6,
                    updated_at = ?7
             WHERE id = ?8",
            params![
                input.title.trim(),
                input.provider_id,
                input.persona_id,
                input.character_id,
                input.universe_id,
                input.response_preset,
                now_unix(),
                chat_id,
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Чат не найден".into());
    }
    replace_chat_worldbooks(&transaction, chat_id, &input.worldbook_ids)?;
    transaction.commit().map_err(|error| error.to_string())
}

fn replace_chat_worldbooks(
    connection: &Connection,
    chat_id: &str,
    worldbook_ids: &[String],
) -> Result<(), String> {
    connection
        .execute("DELETE FROM chat_worldbooks WHERE chat_id = ?1", params![chat_id])
        .map_err(|error| error.to_string())?;
    let mut inserted = std::collections::HashSet::new();
    for worldbook_id in worldbook_ids {
        if !inserted.insert(worldbook_id) {
            continue;
        }
        let position = inserted.len().saturating_sub(1) as i64;
        connection
            .execute(
                "INSERT INTO chat_worldbooks (chat_id, worldbook_id, position) VALUES (?1, ?2, ?3)",
                params![chat_id, worldbook_id, position],
            )
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn validate_chat_links(connection: &Connection, input: &ChatConfigInput) -> Result<(), String> {
    if input.title.trim().is_empty() {
        return Err("Укажите название чата".into());
    }
    if input.title.chars().count() > 120 {
        return Err("Название чата слишком длинное".into());
    }
    validate_optional_provider(connection, input.provider_id.as_deref())?;
    validate_optional_galaxy(connection, input.persona_id.as_deref(), "persona")?;
    validate_optional_galaxy(connection, input.character_id.as_deref(), "character")?;
    validate_optional_galaxy(connection, input.universe_id.as_deref(), "universe")?;
    for id in &input.worldbook_ids {
        validate_optional_galaxy(connection, Some(id), "worldbook")?;
    }
    if !matches!(
        input.response_preset.as_str(),
        "natural" | "human" | "dialogue-only" | "no-emoji" | "first-person" | "clean-human"
    ) {
        return Err("Неизвестный пресет ответа".into());
    }
    Ok(())
}

fn validate_optional_provider(connection: &Connection, id: Option<&str>) -> Result<(), String> {
    if let Some(id) = id {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM providers WHERE id = ?1)",
                params![id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !exists {
            return Err("Подключение не найдено".into());
        }
    }
    Ok(())
}

fn validate_optional_galaxy(
    connection: &Connection,
    id: Option<&str>,
    kind: &str,
) -> Result<(), String> {
    if let Some(id) = id {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM galaxy_items WHERE id = ?1 AND kind = ?2)",
                params![id, kind],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !exists {
            return Err(format!("Объект типа {kind} не найден"));
        }
    }
    Ok(())
}

pub fn rename_chat(connection: &Connection, chat_id: &str, title: &str) -> Result<(), String> {
    let changed = connection
        .execute(
            "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now_unix(), chat_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Чат не найден".into());
    }
    Ok(())
}

pub fn delete_chat(connection: &Connection, chat_id: &str) -> Result<(), String> {
    let changed = connection
        .execute("DELETE FROM chats WHERE id = ?1", params![chat_id])
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Чат не найден".into());
    }
    Ok(())
}

pub fn set_chat_pinned(
    connection: &Connection,
    chat_id: &str,
    pinned: bool,
) -> Result<(), String> {
    let changed = connection
        .execute(
            "UPDATE chats SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
            params![pinned as i64, now_unix(), chat_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Чат не найден".into());
    }
    Ok(())
}

pub fn clear_chat(connection: &Connection, chat_id: &str) -> Result<(), String> {
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    let exists: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM chats WHERE id = ?1)",
            params![chat_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if !exists {
        return Err("Чат не найден".into());
    }
    transaction
        .execute("DELETE FROM messages WHERE chat_id = ?1", params![chat_id])
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE chats SET preview = '', message_count = 0, updated_at = ?1 WHERE id = ?2",
            params![now_unix(), chat_id],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn messages_for_chat(connection: &Connection, chat_id: &str) -> Result<Vec<Message>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
             FROM messages WHERE chat_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);

    rows.into_iter()
        .map(|(id, chat_id, role, content, created_at, remembered, active_variant_index)| {
            let variants = if role == "assistant" {
                message_variants_for_message(connection, &id)?
            } else {
                Vec::new()
            };
            Ok(Message {
                id,
                chat_id,
                role,
                content,
                created_at: clock_time(created_at),
                remembered,
                active_variant_index,
                variants,
            })
        })
        .collect()
}

pub fn messages_before_message(
    connection: &Connection,
    message_id: &str,
) -> Result<(String, Vec<Message>), String> {
    let (chat_id, created_at, role) = connection
        .query_row(
            "SELECT chat_id, created_at, role FROM messages WHERE id = ?1",
            params![message_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Сообщение не найдено".to_string())?;
    if role != "assistant" {
        return Err("Перегенерировать можно только ответ ассистента".into());
    }

    let mut statement = connection
        .prepare(
            "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
             FROM messages
             WHERE chat_id = ?1 AND created_at < ?2
             ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![chat_id, created_at], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);

    let history = rows
        .into_iter()
        .map(|(id, chat_id, role, content, created_at, remembered, active_variant_index)| {
            Ok(Message {
                variants: if role == "assistant" {
                    message_variants_for_message(connection, &id)?
                } else {
                    Vec::new()
                },
                id,
                chat_id,
                role,
                content,
                created_at: clock_time(created_at),
                remembered,
                active_variant_index,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok((chat_id, history))
}

pub fn add_exchange(
    connection: &Connection,
    chat_id: &str,
    user_message_id: &str,
    user_content: &str,
    assistant_message_id: &str,
    assistant_content: &str,
) -> Result<(), String> {
    let now = now_unix();
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO messages (id, chat_id, role, content, created_at)
             VALUES (?1, ?2, 'user', ?3, ?4)",
            params![user_message_id, chat_id, user_content, now],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO messages (id, chat_id, role, content, created_at, active_variant_index)
             VALUES (?1, ?2, 'assistant', ?3, ?4, 0)",
            params![assistant_message_id, chat_id, assistant_content, now + 1],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO message_variants (id, message_id, position, content, created_at)
             VALUES (?1, ?2, 0, ?3, ?4)",
            params![
                format!("{assistant_message_id}-variant-0"),
                assistant_message_id,
                assistant_content,
                now + 1,
            ],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE chats
             SET preview = ?1,
                 updated_at = ?2,
                 message_count = message_count + 2
             WHERE id = ?3",
            params![assistant_content, now + 1, chat_id],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn append_message_variant(
    connection: &Connection,
    message_id: &str,
    variant_id: &str,
    content: &str,
) -> Result<i64, String> {
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    let (chat_id, role) = transaction
        .query_row(
            "SELECT chat_id, role FROM messages WHERE id = ?1",
            params![message_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Сообщение не найдено".to_string())?;
    if role != "assistant" {
        return Err("История вариантов доступна только для ответов ассистента".into());
    }

    let next_position = transaction
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM message_variants WHERE message_id = ?1",
            params![message_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;
    let now = now_unix();
    transaction
        .execute(
            "INSERT INTO message_variants (id, message_id, position, content, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![variant_id, message_id, next_position, content.trim(), now],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE messages SET content = ?1, active_variant_index = ?2 WHERE id = ?3",
            params![content.trim(), next_position, message_id],
        )
        .map_err(|error| error.to_string())?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(next_position)
}

pub fn select_message_variant(
    connection: &Connection,
    message_id: &str,
    variant_index: i64,
) -> Result<(), String> {
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    let (chat_id, content) = transaction
        .query_row(
            "SELECT messages.chat_id, message_variants.content
             FROM messages
             JOIN message_variants ON message_variants.message_id = messages.id
             WHERE messages.id = ?1 AND message_variants.position = ?2",
            params![message_id, variant_index],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Вариант ответа не найден".to_string())?;
    transaction
        .execute(
            "UPDATE messages SET content = ?1, active_variant_index = ?2 WHERE id = ?3",
            params![content, variant_index, message_id],
        )
        .map_err(|error| error.to_string())?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn chat_response_preset(connection: &Connection, chat_id: &str) -> Result<String, String> {
    connection
        .query_row(
            "SELECT response_preset FROM chats WHERE id = ?1",
            params![chat_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Чат не найден".into())
}

pub fn chat_provider_id(connection: &Connection, chat_id: &str) -> Result<String, String> {
    connection
        .query_row(
            "SELECT provider_id FROM chats WHERE id = ?1",
            params![chat_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Чат не найден".to_string())?
        .ok_or_else(|| "Выберите провайдера в настройках чата".to_string())
}

pub fn clone_chat(
    connection: &Connection,
    source_chat_id: &str,
    new_chat_id: &str,
    include_messages: bool,
    through_message_id: Option<&str>,
) -> Result<String, String> {
    let source = connection
        .query_row(
            "SELECT title, provider_id, persona_id, character_id, universe_id, response_preset
             FROM chats WHERE id = ?1",
            params![source_chat_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Чат не найден".to_string())?;

    let suffix = if through_message_id.is_some() {
        " - ветка"
    } else {
        " - копия"
    };
    let title = format!("{}{}", source.0, suffix);
    let now = now_unix();
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;

    transaction
        .execute(
            "INSERT INTO chats (
                id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, universe_id, response_preset
             ) VALUES (?1, ?2, '', ?3, 0, 0, ?4, ?5, ?6, ?7, ?8)",
            params![
                new_chat_id,
                title,
                now,
                source.1,
                source.2,
                source.3,
                source.4,
                source.5,
            ],
        )
        .map_err(|error| error.to_string())?;

    transaction
        .execute(
            "INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
             SELECT ?1, worldbook_id, position
             FROM chat_worldbooks WHERE chat_id = ?2",
            params![new_chat_id, source_chat_id],
        )
        .map_err(|error| error.to_string())?;

    if include_messages || through_message_id.is_some() {
        let cutoff = match through_message_id {
            Some(message_id) => Some(
                transaction
                    .query_row(
                        "SELECT created_at FROM messages WHERE id = ?1 AND chat_id = ?2",
                        params![message_id, source_chat_id],
                        |row| row.get::<_, i64>(0),
                    )
                    .optional()
                    .map_err(|error| error.to_string())?
                    .ok_or_else(|| "Сообщение не найдено".to_string())?,
            ),
            None => None,
        };

        let mut statement = transaction
            .prepare(
                "SELECT id, role, content, created_at, remembered, active_variant_index
                 FROM messages
                 WHERE chat_id = ?1 AND (?2 IS NULL OR created_at <= ?2)
                 ORDER BY created_at ASC",
            )
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map(params![source_chat_id, cutoff], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        drop(statement);

        for (index, (source_message_id, role, content, created_at, remembered, active_variant_index)) in
            rows.iter().enumerate()
        {
            let new_message_id = format!("{new_chat_id}-message-{index}");
            transaction
                .execute(
                    "INSERT INTO messages (
                        id, chat_id, role, content, created_at, remembered, active_variant_index
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        new_message_id,
                        new_chat_id,
                        role,
                        content,
                        created_at,
                        remembered,
                        active_variant_index,
                    ],
                )
                .map_err(|error| error.to_string())?;

            if role == "assistant" {
                let mut variant_statement = transaction
                    .prepare(
                        "SELECT position, content, created_at
                         FROM message_variants WHERE message_id = ?1 ORDER BY position ASC",
                    )
                    .map_err(|error| error.to_string())?;
                let variants = variant_statement
                    .query_map(params![source_message_id], |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, i64>(2)?,
                        ))
                    })
                    .map_err(|error| error.to_string())?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|error| error.to_string())?;
                drop(variant_statement);

                for (position, variant_content, variant_created_at) in variants {
                    transaction
                        .execute(
                            "INSERT INTO message_variants (id, message_id, position, content, created_at)
                             VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![
                                format!("{new_message_id}-variant-{position}"),
                                new_message_id,
                                position,
                                variant_content,
                                variant_created_at,
                            ],
                        )
                        .map_err(|error| error.to_string())?;
                }
            }
        }
        refresh_chat_summary(&transaction, new_chat_id)?;
    }

    transaction.commit().map_err(|error| error.to_string())?;
    Ok(title)
}

pub fn edit_message(
    connection: &Connection,
    message_id: &str,
    variant_id: &str,
    content: &str,
) -> Result<(), String> {
    let (chat_id, role) = connection
        .query_row(
            "SELECT chat_id, role FROM messages WHERE id = ?1",
            params![message_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Сообщение не найдено".to_string())?;

    if role == "assistant" {
        append_message_variant(connection, message_id, variant_id, content)?;
        return Ok(());
    }

    let changed = connection
        .execute(
            "UPDATE messages SET content = ?1 WHERE id = ?2",
            params![content.trim(), message_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Сообщение не найдено".into());
    }
    refresh_chat_summary(connection, &chat_id)
}

pub fn delete_message(connection: &Connection, message_id: &str) -> Result<(), String> {
    let chat_id = connection
        .query_row(
            "SELECT chat_id FROM messages WHERE id = ?1",
            params![message_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Сообщение не найдено".to_string())?;
    connection
        .execute("DELETE FROM messages WHERE id = ?1", params![message_id])
        .map_err(|error| error.to_string())?;
    refresh_chat_summary(connection, &chat_id)
}

pub fn set_message_remembered(
    connection: &Connection,
    message_id: &str,
    remembered: bool,
) -> Result<(), String> {
    let changed = connection
        .execute(
            "UPDATE messages SET remembered = ?1 WHERE id = ?2",
            params![remembered as i64, message_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Сообщение не найдено".into());
    }
    Ok(())
}

fn refresh_chat_summary(connection: &Connection, chat_id: &str) -> Result<(), String> {
    let (message_count, preview, updated_at) = connection
        .query_row(
            "SELECT COUNT(*),
                    COALESCE((SELECT content FROM messages WHERE chat_id = ?1 ORDER BY created_at DESC LIMIT 1), ''),
                    COALESCE((SELECT created_at FROM messages WHERE chat_id = ?1 ORDER BY created_at DESC LIMIT 1), ?2)
             FROM messages WHERE chat_id = ?1",
            params![chat_id, now_unix()],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "UPDATE chats SET preview = ?1, message_count = ?2, updated_at = ?3 WHERE id = ?4",
            params![preview, message_count, updated_at, chat_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn get_provider(connection: &Connection, id: &str) -> Result<Provider, String> {
    connection
        .query_row(
            "SELECT id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens
             FROM providers WHERE id = ?1",
            params![id],
            |row| {
                Ok(Provider {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    kind: row.get(2)?,
                    model: row.get(3)?,
                    status: row.get(4)?,
                    base_url: row.get(5)?,
                    account_id: row.get(6)?,
                    latency_ms: row.get(7)?,
                    temperature: row.get(8)?,
                    top_p: row.get(9)?,
                    max_tokens: row.get(10)?,
                    has_secret: false,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Подключение не найдено".into())
}

pub fn upsert_galaxy_item(
    connection: &Connection,
    id: &str,
    input: &GalaxyItemInput,
) -> Result<GalaxyItem, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("Укажите название".into());
    }
    if name.chars().count() > 120 {
        return Err("Название слишком длинное".into());
    }
    if !input.data.is_object() {
        return Err("Параметры объекта должны быть JSON-объектом".into());
    }
    validate_galaxy_data(connection, input)?;

    let existing_kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if existing_kind
        .as_deref()
        .is_some_and(|kind| kind != input.kind.as_str())
    {
        return Err("Тип существующего объекта нельзя изменить".into());
    }

    let (badge, accent) = galaxy_presentation(&input.kind)?;
    let now = now_unix();
    let data_json = serde_json::to_string(&input.data).map_err(|error| error.to_string())?;
    if data_json.len() > 1_000_000 {
        return Err("Параметры объекта слишком большие".into());
    }
    connection
        .execute(
            r#"INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
               ON CONFLICT(id) DO UPDATE SET
                 kind = excluded.kind,
                 name = excluded.name,
                 description = excluded.description,
                 data_json = excluded.data_json,
                 badge = excluded.badge,
                 accent = excluded.accent,
                 updated_at = excluded.updated_at"#,
            params![
                id,
                input.kind,
                name,
                input.description.trim(),
                data_json,
                badge,
                accent,
                now
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(GalaxyItem {
        id: id.into(),
        kind: input.kind.clone(),
        name: name.into(),
        description: input.description.trim().into(),
        data: input.data.clone(),
        badge: badge.into(),
        accent: accent.into(),
        updated_at: relative_time(now),
    })
}

fn validate_galaxy_data(
    connection: &Connection,
    input: &GalaxyItemInput,
) -> Result<(), String> {
    if input.kind != "character" {
        return Ok(());
    }

    let preset = input
        .data
        .get("stylePreset")
        .and_then(Value::as_str)
        .unwrap_or("neutral");
    if !matches!(
        preset,
        "neutral" | "warm" | "concise" | "roleplay" | "literary" | "custom"
    ) {
        return Err("Неизвестный пресет стиля персонажа".into());
    }

    if preset == "custom" {
        let style_id = input
            .data
            .get("styleItemId")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Выберите сохранённый стиль переписки".to_string())?;
        validate_optional_galaxy(connection, Some(style_id), "style")?;
    }

    Ok(())
}

pub fn get_chat_prompt_context(
    connection: &Connection,
    chat_id: &str,
) -> Result<ChatPromptContext, String> {
    let (persona_id, character_id, universe_id): (Option<String>, Option<String>, Option<String>) =
        connection
            .query_row(
                "SELECT persona_id, character_id, universe_id FROM chats WHERE id = ?1",
                params![chat_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Чат не найден".to_string())?;

    let persona = persona_id
        .as_deref()
        .map(|id| get_galaxy_item(connection, id))
        .transpose()?;
    let character = character_id
        .as_deref()
        .map(|id| get_galaxy_item(connection, id))
        .transpose()?;
    let universe = universe_id
        .as_deref()
        .map(|id| get_galaxy_item(connection, id))
        .transpose()?;
    let worldbooks = worldbook_ids_for_chat(connection, chat_id)?
        .iter()
        .map(|id| get_galaxy_item(connection, id))
        .collect::<Result<Vec<_>, _>>()?;
    let character_style = character
        .as_ref()
        .and_then(|item| item.data.get("styleItemId"))
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty())
        .and_then(|id| get_galaxy_item(connection, id).ok())
        .filter(|item| item.kind == "style");

    Ok(ChatPromptContext {
        persona,
        character,
        universe,
        worldbooks,
        character_style,
    })
}

fn get_galaxy_item(connection: &Connection, id: &str) -> Result<GalaxyItem, String> {
    connection
        .query_row(
            "SELECT id, kind, name, description, data_json, badge, accent, updated_at
             FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| {
                let data_json: String = row.get(4)?;
                Ok(GalaxyItem {
                    id: row.get(0)?,
                    kind: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    data: serde_json::from_str(&data_json)
                        .unwrap_or(Value::Object(Default::default())),
                    badge: row.get(5)?,
                    accent: row.get(6)?,
                    updated_at: relative_time(row.get(7)?),
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Объект Галактики не найден".into())
}

pub fn delete_galaxy_item(connection: &Connection, id: &str) -> Result<(), String> {
    let kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Объект Галактики не найден".to_string())?;

    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute("UPDATE chats SET persona_id = NULL WHERE persona_id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("UPDATE chats SET character_id = NULL WHERE character_id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("UPDATE chats SET universe_id = NULL WHERE universe_id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM chat_worldbooks WHERE worldbook_id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    if kind == "style" {
        clear_character_style_references(&transaction, id)?;
    }

    transaction
        .execute("DELETE FROM galaxy_items WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

fn clear_character_style_references(
    connection: &Connection,
    style_id: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare("SELECT id, data_json FROM galaxy_items WHERE kind = 'character'")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    drop(statement);

    for (character_id, data_json) in rows {
        let mut data = serde_json::from_str::<Value>(&data_json)
            .unwrap_or(Value::Object(Default::default()));
        let references_style = data
            .get("styleItemId")
            .and_then(Value::as_str)
            .is_some_and(|value| value == style_id);
        if !references_style {
            continue;
        }

        if let Some(object) = data.as_object_mut() {
            object.insert("stylePreset".into(), Value::String("neutral".into()));
            object.remove("styleItemId");
        }
        let updated = serde_json::to_string(&data).map_err(|error| error.to_string())?;
        connection
            .execute(
                "UPDATE galaxy_items SET data_json = ?1, updated_at = ?2 WHERE id = ?3",
                params![updated, now_unix(), character_id],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn save_provider(connection: &Connection, provider: &Provider) -> Result<(), String> {
    connection
        .execute(
            r#"INSERT INTO providers (
                    id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens, created_at, updated_at
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
               ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    kind = excluded.kind,
                    model = excluded.model,
                    status = excluded.status,
                    base_url = excluded.base_url,
                    account_id = excluded.account_id,
                    latency_ms = excluded.latency_ms,
                    temperature = excluded.temperature,
                    top_p = excluded.top_p,
                    max_tokens = excluded.max_tokens,
                    updated_at = excluded.updated_at"#,
            params![
                provider.id,
                provider.name,
                provider.kind,
                provider.model,
                provider.status,
                provider.base_url,
                provider.account_id,
                provider.latency_ms,
                provider.temperature,
                provider.top_p,
                provider.max_tokens,
                now_unix()
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn update_provider_health(
    connection: &Connection,
    id: &str,
    status: &str,
    latency_ms: Option<i64>,
) -> Result<(), String> {
    connection
        .execute(
            "UPDATE providers SET status = ?1, latency_ms = ?2, updated_at = ?3 WHERE id = ?4",
            params![status, latency_ms, now_unix(), id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn delete_provider(connection: &Connection, id: &str) -> Result<(), String> {
    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE chats SET provider_id = NULL WHERE provider_id = ?1",
            params![id],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM providers WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn record_usage(
    connection: &Connection,
    id: &str,
    provider_id: &str,
    model: &str,
    input_tokens: i64,
    output_tokens: i64,
) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO usage_events (
                id, provider_id, model, input_tokens, output_tokens, request_count, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
            params![
                id,
                provider_id,
                model,
                input_tokens.max(0),
                output_tokens.max(0),
                now_unix()
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn update_settings(connection: &Connection, settings: &AppSettings) -> Result<(), String> {
    connection
        .execute(
            "UPDATE app_settings
             SET profile_name = ?1, profile_avatar = ?2,
                 animations = ?3, haptics = ?4, compact_mode = ?5,
                 send_on_enter = ?6, save_drafts = ?7, interface_scale = ?8,
                 sidebar_width = ?9, chat_sidebar_width = ?10,
                 sidebar_collapsed = ?11, theme_mode = ?12, theme_variant = ?13
             WHERE id = 1",
            params![
                settings.profile_name,
                settings.profile_avatar,
                settings.animations as i64,
                settings.haptics as i64,
                settings.compact_mode as i64,
                settings.send_on_enter as i64,
                settings.save_drafts as i64,
                settings.interface_scale,
                settings.sidebar_width,
                settings.chat_sidebar_width,
                settings.sidebar_collapsed as i64,
                settings.theme_mode,
                settings.theme_variant
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn galaxy_presentation(kind: &str) -> Result<(&'static str, &'static str), String> {
    match kind {
        "persona" => Ok(("Персона", "slate")),
        "character" => Ok(("Персонаж", "blue")),
        "universe" => Ok(("Вселенная", "indigo")),
        "worldbook" => Ok(("Ворлдбук", "amber")),
        "style" => Ok(("Стиль", "violet")),
        _ => Err("Неизвестный тип объекта галактики".into()),
    }
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn relative_time(timestamp: i64) -> String {
    let seconds = now_unix().saturating_sub(timestamp);
    match seconds {
        0..=59 => "сейчас".into(),
        60..=3_599 => format!("{} мин", seconds / 60),
        3_600..=86_399 => format!("{} ч", seconds / 3_600),
        86_400..=604_799 => format!("{} дн", seconds / 86_400),
        _ => "давно".into(),
    }
}

fn clock_time(timestamp: i64) -> String {
    let seconds_in_day = timestamp.rem_euclid(86_400);
    let hours = seconds_in_day / 3_600;
    let minutes = (seconds_in_day % 3_600) / 60;
    format!("{hours:02}:{minutes:02}")
}
