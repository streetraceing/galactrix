use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{
    AppSettings, AppSnapshot, Chat, GalaxyItem, Message, Provider, UsagePoint,
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
    seed_preview_data(&connection)?;
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
                pinned INTEGER NOT NULL DEFAULT 0
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
                accent TEXT NOT NULL DEFAULT 'violet',
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'connected',
                base_url TEXT,
                account_id TEXT,
                latency_ms INTEGER,
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
    Ok(())
}

fn seed_preview_data(connection: &Connection) -> Result<(), String> {
    let chat_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM chats", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    if chat_count == 0 {
        connection
            .execute(
                "INSERT INTO chats (id, title, preview, updated_at, message_count, pinned) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params!["chat-1", "Город под стеклянным небом", "Продолжим сцену с момента, когда поезд остановился...", now_unix(), 3, 1],
            )
            .map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params!["message-1", "chat-1", "assistant", "Поезд остановился без толчка. За стеклом не было станции — только тихий город под огромным прозрачным куполом.", now_unix() - 120],
            )
            .map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params!["message-2", "chat-1", "user", "Пусть мой персонаж выйдет первым и попробует понять, кто выключил свет на платформе.", now_unix() - 60],
            )
            .map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params!["message-3", "chat-1", "assistant", "Двери раскрылись. На платформе пахло мокрым металлом, а в дальнем конце кто-то медленно поднял фонарь — но свет в нём был чёрным.", now_unix()],
            )
            .map_err(|error| error.to_string())?;
    }

    let galaxy_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM galaxy_items", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    if galaxy_count == 0 {
        let items = [
            ("galaxy-1", "persona", "Наблюдатель", "Спокойная персона для вдумчивых технических и творческих диалогов.", "Персона", "violet"),
            ("galaxy-2", "character", "Лира Вейл", "Проводница между мирами, скрывающая происхождение своей памяти.", "Персонаж", "cyan"),
            ("galaxy-3", "universe", "Стеклянное небо", "Мир городов-куполов, забытых поездов и медленно гаснущих звёзд.", "Вселенная", "rose"),
            ("galaxy-4", "worldbook", "Фракции и технологии", "42 записи: организации, артефакты, правила магии и ключевые места.", "Ворлдбук", "amber"),
        ];
        for (id, kind, name, description, badge, accent) in items {
            connection
                .execute(
                    "INSERT INTO galaxy_items (id, kind, name, description, badge, accent, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![id, kind, name, description, badge, accent, now_unix()],
                )
                .map_err(|error| error.to_string())?;
        }
    }

    let provider_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM providers", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if provider_count == 0 {
        connection
            .execute(
                "INSERT INTO providers (id, name, kind, model, status, latency_ms, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
                params!["provider-1", "Mistral", "mistral", "mistral-large-latest", "connected", 420, now_unix()],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn snapshot(connection: &Connection) -> Result<AppSnapshot, String> {
    Ok(AppSnapshot {
        chats: list_chats(connection)?,
        messages: list_messages(connection)?,
        galaxy_items: list_galaxy_items(connection)?,
        providers: list_providers(connection)?,
        settings: get_settings(connection)?,
        usage: weekly_usage(connection)?,
    })
}

fn list_chats(connection: &Connection) -> Result<Vec<Chat>, String> {
    let mut statement = connection
        .prepare("SELECT id, title, preview, updated_at, message_count, pinned FROM chats ORDER BY pinned DESC, updated_at DESC")
        .map_err(|error| error.to_string())?;
    let chats = statement
        .query_map([], |row| {
            Ok(Chat {
                id: row.get(0)?,
                title: row.get(1)?,
                preview: row.get(2)?,
                updated_at: relative_time(row.get(3)?),
                message_count: row.get(4)?,
                pinned: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());

    chats
}

fn list_messages(connection: &Connection) -> Result<Vec<Message>, String> {
    let mut statement = connection
        .prepare("SELECT id, chat_id, role, content, created_at FROM messages ORDER BY created_at ASC")
        .map_err(|error| error.to_string())?;
    let messages = statement
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

    messages
}

fn list_galaxy_items(connection: &Connection) -> Result<Vec<GalaxyItem>, String> {
    let mut statement = connection
        .prepare("SELECT id, kind, name, description, badge, accent, updated_at FROM galaxy_items ORDER BY updated_at DESC")
        .map_err(|error| error.to_string())?;
    let items = statement
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

    items
}

fn list_providers(connection: &Connection) -> Result<Vec<Provider>, String> {
    let mut statement = connection
        .prepare("SELECT id, name, kind, model, status, base_url, account_id, latency_ms FROM providers ORDER BY updated_at DESC")
        .map_err(|error| error.to_string())?;
    let providers = statement
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
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());

    providers
}

fn get_settings(connection: &Connection) -> Result<AppSettings, String> {
    connection
        .query_row(
            "SELECT animations, haptics, compact_mode, send_on_enter, save_drafts FROM app_settings WHERE id = 1",
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
    let total: Option<(i64, i64)> = connection
        .query_row(
            "SELECT COALESCE(SUM(input_tokens + output_tokens), 0), COALESCE(SUM(request_count), 0) FROM usage_events WHERE created_at >= ?1",
            params![now_unix() - 7 * 24 * 60 * 60],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let (tokens, requests) = total.unwrap_or((0, 0));
    if tokens == 0 && requests == 0 {
        return Ok(vec![
            UsagePoint { label: "Пн".into(), tokens: 18_000, requests: 21 },
            UsagePoint { label: "Вт".into(), tokens: 32_000, requests: 39 },
            UsagePoint { label: "Ср".into(), tokens: 26_000, requests: 32 },
            UsagePoint { label: "Чт".into(), tokens: 47_000, requests: 55 },
            UsagePoint { label: "Пт".into(), tokens: 39_000, requests: 44 },
            UsagePoint { label: "Сб".into(), tokens: 61_000, requests: 73 },
            UsagePoint { label: "Вс".into(), tokens: 52_000, requests: 64 },
        ]);
    }

    // The production version should group by the user's local calendar day.
    let labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    Ok(labels
        .into_iter()
        .enumerate()
        .map(|(index, label)| UsagePoint {
            label: label.into(),
            tokens: if index == 6 { tokens } else { 0 },
            requests: if index == 6 { requests } else { 0 },
        })
        .collect())
}

pub fn create_chat(connection: &Connection, id: &str, title: &str) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO chats (id, title, preview, updated_at, message_count, pinned) VALUES (?1, ?2, '', ?3, 0, 0)",
            params![id, title, now_unix()],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn add_message(connection: &Connection, id: &str, chat_id: &str, role: &str, content: &str) -> Result<(), String> {
    let transaction = connection.unchecked_transaction().map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, chat_id, role, content, now_unix()],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE chats SET preview = ?1, updated_at = ?2, message_count = message_count + 1 WHERE id = ?3",
            params![content, now_unix(), chat_id],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn save_galaxy_item(connection: &Connection, item: &GalaxyItem) -> Result<(), String> {
    connection
        .execute(
            r#"INSERT INTO galaxy_items (id, kind, name, description, badge, accent, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
               ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, name = excluded.name,
                 description = excluded.description, badge = excluded.badge,
                 accent = excluded.accent, updated_at = excluded.updated_at"#,
            params![item.id, item.kind, item.name, item.description, item.badge, item.accent, now_unix()],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn save_provider(connection: &Connection, provider: &Provider) -> Result<(), String> {
    connection
        .execute(
            r#"INSERT INTO providers (id, name, kind, model, status, base_url, account_id, latency_ms, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
               ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind,
                 model = excluded.model, status = excluded.status, base_url = excluded.base_url,
                 account_id = excluded.account_id, latency_ms = excluded.latency_ms,
                 updated_at = excluded.updated_at"#,
            params![provider.id, provider.name, provider.kind, provider.model, provider.status, provider.base_url, provider.account_id, provider.latency_ms, now_unix()],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn update_settings(connection: &Connection, settings: &AppSettings) -> Result<(), String> {
    connection
        .execute(
            "UPDATE app_settings SET animations = ?1, haptics = ?2, compact_mode = ?3, send_on_enter = ?4, save_drafts = ?5 WHERE id = 1",
            params![settings.animations as i64, settings.haptics as i64, settings.compact_mode as i64, settings.send_on_enter as i64, settings.save_drafts as i64],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
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
        60..=3599 => format!("{} мин", seconds / 60),
        3600..=86_399 => format!("{} ч", seconds / 3600),
        86_400..=604_799 => format!("{} дн", seconds / 86_400),
        _ => "давно".into(),
    }
}

fn clock_time(timestamp: i64) -> String {
    let seconds_in_day = timestamp.rem_euclid(86_400);
    let hours = seconds_in_day / 3600;
    let minutes = (seconds_in_day % 3600) / 60;
    format!("{hours:02}:{minutes:02}")
}
