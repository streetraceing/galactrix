use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{
    AppSettings, AppSnapshot, Chat, GalaxyItem, GalaxyItemInput, Message, Provider, UsagePoint,
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
                provider_id TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_messages_chat_created
                ON messages(chat_id, created_at);

            CREATE TABLE IF NOT EXISTS galaxy_items (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                badge TEXT NOT NULL DEFAULT '',
                accent TEXT NOT NULL DEFAULT 'neutral',
                updated_at INTEGER NOT NULL
            );

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
                animations INTEGER NOT NULL DEFAULT 1,
                haptics INTEGER NOT NULL DEFAULT 1,
                compact_mode INTEGER NOT NULL DEFAULT 0,
                send_on_enter INTEGER NOT NULL DEFAULT 1,
                save_drafts INTEGER NOT NULL DEFAULT 1
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
        usage: weekly_usage(connection)?,
        app_version: app_version.to_owned(),
    })
}

fn list_chats(connection: &Connection) -> Result<Vec<Chat>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, title, preview, updated_at, message_count, pinned, provider_id
             FROM chats ORDER BY pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([], |row| {
            Ok(Chat {
                id: row.get(0)?,
                title: row.get(1)?,
                preview: row.get(2)?,
                updated_at: relative_time(row.get(3)?),
                message_count: row.get(4)?,
                pinned: row.get::<_, i64>(5)? != 0,
                provider_id: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn list_messages(connection: &Connection) -> Result<Vec<Message>, String> {
    let mut statement = connection
        .prepare("SELECT id, chat_id, role, content, created_at FROM messages ORDER BY created_at ASC")
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([], |row| {
            let timestamp: i64 = row.get(4)?;
            Ok(Message {
                id: row.get(0)?,
                chat_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: clock_time(timestamp),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn list_galaxy_items(connection: &Connection) -> Result<Vec<GalaxyItem>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, kind, name, description, badge, accent, updated_at
             FROM galaxy_items ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([], |row| {
            Ok(GalaxyItem {
                id: row.get(0)?,
                kind: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                badge: row.get(4)?,
                accent: row.get(5)?,
                updated_at: relative_time(row.get(6)?),
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
            "SELECT animations, haptics, compact_mode, send_on_enter, save_drafts
             FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    animations: row.get::<_, i64>(0)? != 0,
                    haptics: row.get::<_, i64>(1)? != 0,
                    compact_mode: row.get::<_, i64>(2)? != 0,
                    send_on_enter: row.get::<_, i64>(3)? != 0,
                    save_drafts: row.get::<_, i64>(4)? != 0,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn weekly_usage(connection: &Connection) -> Result<Vec<UsagePoint>, String> {
    const DAY_SECONDS: i64 = 86_400;
    const LABELS: [&str; 7] = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

    let today = now_unix().div_euclid(DAY_SECONDS);
    let mut points = Vec::with_capacity(7);
    for offset in (0..7).rev() {
        let day = today - offset;
        let start = day * DAY_SECONDS;
        let end = start + DAY_SECONDS;
        let (tokens, requests) = connection
            .query_row(
                "SELECT COALESCE(SUM(input_tokens + output_tokens), 0),
                        COALESCE(SUM(request_count), 0)
                 FROM usage_events WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|error| error.to_string())?;
        let weekday = (day + 3).rem_euclid(7) as usize;
        points.push(UsagePoint {
            label: LABELS[weekday].into(),
            tokens,
            requests,
        });
    }
    Ok(points)
}

pub fn create_chat(connection: &Connection, id: &str, title: &str) -> Result<(), String> {
    let default_provider: Option<String> = connection
        .query_row(
            "SELECT id FROM providers WHERE status = 'connected' ORDER BY updated_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO chats (id, title, preview, updated_at, message_count, pinned, provider_id)
             VALUES (?1, ?2, '', ?3, 0, 0, ?4)",
            params![id, title, now_unix(), default_provider],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn set_chat_provider(
    connection: &Connection,
    chat_id: &str,
    provider_id: Option<&str>,
) -> Result<(), String> {
    if let Some(provider_id) = provider_id {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM providers WHERE id = ?1)",
                params![provider_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !exists {
            return Err("Подключение не найдено".into());
        }
    }
    let changed = connection
        .execute(
            "UPDATE chats SET provider_id = ?1 WHERE id = ?2",
            params![provider_id, chat_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Чат не найден".into());
    }
    Ok(())
}

pub fn messages_for_chat(connection: &Connection, chat_id: &str) -> Result<Vec<Message>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, chat_id, role, content, created_at
             FROM messages WHERE chat_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map(params![chat_id], |row| {
            let timestamp: i64 = row.get(4)?;
            Ok(Message {
                id: row.get(0)?,
                chat_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: clock_time(timestamp),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
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
            "INSERT INTO messages (id, chat_id, role, content, created_at)
             VALUES (?1, ?2, 'assistant', ?3, ?4)",
            params![assistant_message_id, chat_id, assistant_content, now + 1],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE chats
             SET preview = ?1,
                 title = CASE WHEN message_count = 0 THEN ?2 ELSE title END,
                 updated_at = ?3,
                 message_count = message_count + 2
             WHERE id = ?4",
            params![assistant_content, title_from_content(user_content), now + 1, chat_id],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
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
    let (badge, accent) = galaxy_presentation(&input.kind)?;
    let now = now_unix();
    connection
        .execute(
            r#"INSERT INTO galaxy_items (id, kind, name, description, badge, accent, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
               ON CONFLICT(id) DO UPDATE SET
                 kind = excluded.kind,
                 name = excluded.name,
                 description = excluded.description,
                 badge = excluded.badge,
                 accent = excluded.accent,
                 updated_at = excluded.updated_at"#,
            params![
                id,
                input.kind,
                input.name.trim(),
                input.description.trim(),
                badge,
                accent,
                now
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(GalaxyItem {
        id: id.into(),
        kind: input.kind.clone(),
        name: input.name.trim().into(),
        description: input.description.trim().into(),
        badge: badge.into(),
        accent: accent.into(),
        updated_at: relative_time(now),
    })
}

pub fn delete_galaxy_item(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM galaxy_items WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
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
             SET animations = ?1, haptics = ?2, compact_mode = ?3,
                 send_on_enter = ?4, save_drafts = ?5
             WHERE id = 1",
            params![
                settings.animations as i64,
                settings.haptics as i64,
                settings.compact_mode as i64,
                settings.send_on_enter as i64,
                settings.save_drafts as i64
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
        _ => Err("Неизвестный тип объекта галактики".into()),
    }
}

fn title_from_content(content: &str) -> String {
    let normalized = content.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut title = normalized.chars().take(56).collect::<String>();
    if normalized.chars().count() > 56 {
        title.push('…');
    }
    if title.is_empty() {
        "Новый чат".into()
    } else {
        title
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
