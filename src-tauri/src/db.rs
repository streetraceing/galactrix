use std::{collections::HashMap, path::Path};

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    AppSettings, AppSnapshot, Chat, ChatConfigInput, ChatPromptContext, ChatState, GalaxyItem,
    GalaxyItemInput, Message, MessageVariant, PromptConfig, Provider, UsagePoint,
};

pub fn open(path: &Path) -> CommandResult<Connection> {
    let connection = Connection::open(path)?;
    connection
        .pragma_update(None, "foreign_keys", "ON")?;
    connection
        .pragma_update(None, "journal_mode", "WAL")?;
    migrate(&connection)?;
    remove_legacy_preview_data(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> CommandResult<()> {
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
                response_preset TEXT NOT NULL DEFAULT 'natural',
                prompt_config_json TEXT NOT NULL DEFAULT '{}'
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
                profile_name TEXT NOT NULL DEFAULT '',
                profile_avatar TEXT,
                animations INTEGER NOT NULL DEFAULT 1,
                haptics INTEGER NOT NULL DEFAULT 1,
                compact_mode INTEGER NOT NULL DEFAULT 0,
                send_on_enter INTEGER NOT NULL DEFAULT 1,
                save_drafts INTEGER NOT NULL DEFAULT 1,
                chat_view_mode TEXT NOT NULL DEFAULT 'conversation',
                show_message_avatars INTEGER NOT NULL DEFAULT 1,
                show_message_timestamps INTEGER NOT NULL DEFAULT 1,
                response_language TEXT NOT NULL DEFAULT 'app',
                interface_scale REAL NOT NULL DEFAULT 1.0,
                sidebar_width INTEGER NOT NULL DEFAULT 248,
                chat_sidebar_width INTEGER NOT NULL DEFAULT 320,
                sidebar_collapsed INTEGER NOT NULL DEFAULT 0,
                theme_mode TEXT NOT NULL DEFAULT 'system',
                theme_variant TEXT NOT NULL DEFAULT 'default',
                language TEXT NOT NULL DEFAULT 'system'
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

            CREATE TABLE IF NOT EXISTS app_migrations (
                name TEXT PRIMARY KEY
            );

            INSERT OR IGNORE INTO app_settings (id, profile_name) VALUES (1, '');
            "#,
        )?;

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
        "chats",
        "prompt_config_json",
        "TEXT NOT NULL DEFAULT '{}'",
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
        "TEXT NOT NULL DEFAULT ''",
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
    ensure_column(
        connection,
        "app_settings",
        "language",
        "TEXT NOT NULL DEFAULT 'system'",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "chat_view_mode",
        "TEXT NOT NULL DEFAULT 'conversation'",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "show_message_avatars",
        "INTEGER NOT NULL DEFAULT 1",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "show_message_timestamps",
        "INTEGER NOT NULL DEFAULT 1",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "response_language",
        "TEXT NOT NULL DEFAULT 'app'",
    )?;
    connection
        .execute_batch(
            r#"
            INSERT OR IGNORE INTO message_variants (id, message_id, position, content, created_at)
            SELECT id || '-variant-0', id, 0, content, created_at
            FROM messages
            WHERE role = 'assistant';
            "#,
        )?;
    migrate_legacy_profile_name(connection)?;
    migrate_prompt_configs(connection)?;
    Ok(())
}

fn migrate_legacy_profile_name(connection: &Connection) -> CommandResult<()> {
    connection
        .execute_batch(
            r#"
            BEGIN IMMEDIATE;
            UPDATE app_settings
            SET profile_name = ''
            WHERE profile_name = 'Вы'
              AND NOT EXISTS (
                  SELECT 1
                  FROM app_migrations
                  WHERE name = 'profile-name-placeholder-v1'
              );
            INSERT OR IGNORE INTO app_migrations (name)
            VALUES ('profile-name-placeholder-v1');
            COMMIT;
            "#,
        )?;
    Ok(())
}

fn migrate_prompt_configs(connection: &Connection) -> CommandResult<()> {
    let mut statement = connection
        .prepare("SELECT id, response_preset, prompt_config_json FROM chats")?;
    let chats = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (id, legacy_preset, raw_config) in chats {
        if !raw_config.trim().is_empty() && raw_config.trim() != "{}" {
            continue;
        }
        let config = PromptConfig::from_legacy(&legacy_preset);
        let serialized = serde_json::to_string(&config)?;
        connection
            .execute(
                "UPDATE chats SET prompt_config_json = ?1 WHERE id = ?2",
                params![serialized, id],
            )?;
    }
    Ok(())
}

fn parse_prompt_config(raw: &str, legacy_preset: &str) -> PromptConfig {
    if raw.trim().is_empty() || raw.trim() == "{}" {
        return PromptConfig::from_legacy(legacy_preset);
    }
    serde_json::from_str(raw).unwrap_or_else(|_| PromptConfig::from_legacy(legacy_preset))
}

fn prompt_config_json(config: &PromptConfig) -> CommandResult<String> {
    Ok(serde_json::to_string(config)?)
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> CommandResult<()> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    if !columns.iter().any(|name| name == column) {
        connection
            .execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"))?;
    }
    Ok(())
}

fn remove_legacy_preview_data(connection: &Connection) -> CommandResult<()> {
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
        )?;
    Ok(())
}

pub fn snapshot(connection: &Connection, app_version: &str) -> CommandResult<AppSnapshot> {
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

fn worldbook_ids_by_chat(connection: &Connection) -> CommandResult<HashMap<String, Vec<String>>> {
    let mut statement = connection.prepare(
        "SELECT chat_id, worldbook_id FROM chat_worldbooks ORDER BY chat_id, position ASC",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut result: HashMap<String, Vec<String>> = HashMap::new();
    for (chat_id, worldbook_id) in rows {
        result.entry(chat_id).or_default().push(worldbook_id);
    }
    Ok(result)
}

fn list_chats(connection: &Connection) -> CommandResult<Vec<Chat>> {
    let mut worldbooks = worldbook_ids_by_chat(connection)?;
    let mut statement = connection.prepare(
        "SELECT id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, universe_id, prompt_config_json, response_preset
         FROM chats ORDER BY pinned DESC, updated_at DESC",
    )?;
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
                row.get::<_, String>(11)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows
        .into_iter()
        .map(
            |(
                id,
                title,
                preview,
                updated_at,
                message_count,
                pinned,
                provider_id,
                persona_id,
                character_id,
                universe_id,
                prompt_config_json,
                legacy_preset,
            )| Chat {
                worldbook_ids: worldbooks.remove(&id).unwrap_or_default(),
                id,
                title,
                preview,
                updated_at,
                message_count,
                pinned,
                provider_id,
                persona_id,
                character_id,
                universe_id,
                prompt_config: parse_prompt_config(&prompt_config_json, &legacy_preset),
            },
        )
        .collect())
}

fn worldbook_ids_for_chat(connection: &Connection, chat_id: &str) -> CommandResult<Vec<String>> {
    let mut statement = connection.prepare(
        "SELECT worldbook_id FROM chat_worldbooks WHERE chat_id = ?1 ORDER BY position ASC",
    )?;
    let worldbook_ids = {
        let rows = statement.query_map(params![chat_id], |row| row.get(0))?;
        rows.collect::<Result<Vec<_>, _>>()
    }?;
    Ok(worldbook_ids)
}

pub fn get_chat(connection: &Connection, chat_id: &str) -> CommandResult<Chat> {
    let row = connection
        .query_row(
            "SELECT id, title, preview, updated_at, message_count, pinned, provider_id,
                    persona_id, character_id, universe_id, prompt_config_json, response_preset
             FROM chats WHERE id = ?1",
            params![chat_id],
            |row| {
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
                    row.get::<_, String>(11)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?;
    Ok(Chat {
        id: row.0.clone(),
        title: row.1,
        preview: row.2,
        updated_at: row.3,
        message_count: row.4,
        pinned: row.5,
        provider_id: row.6,
        persona_id: row.7,
        character_id: row.8,
        universe_id: row.9,
        prompt_config: parse_prompt_config(&row.10, &row.11),
        worldbook_ids: worldbook_ids_for_chat(connection, &row.0)?,
    })
}

type MessageVariantRow = (String, String, i64, String, i64);

fn variants_from_rows(rows: Vec<MessageVariantRow>) -> HashMap<String, Vec<MessageVariant>> {
    let mut result: HashMap<String, Vec<MessageVariant>> = HashMap::new();
    for (message_id, id, index, content, created_at) in rows {
        result.entry(message_id).or_default().push(MessageVariant {
            id,
            index,
            content,
            created_at: clock_time(created_at),
        });
    }
    result
}

fn all_message_variants(
    connection: &Connection,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT message_id, id, position, content, created_at
         FROM message_variants ORDER BY message_id, position ASC",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

fn message_variants_for_chat(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

fn message_variants_before(
    connection: &Connection,
    chat_id: &str,
    created_at: i64,
    message_rowid: i64,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
           AND (messages.created_at < ?2
                OR (messages.created_at = ?2 AND messages.rowid < ?3))
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

fn message_variants_through(
    connection: &Connection,
    chat_id: &str,
    created_at: i64,
    message_rowid: i64,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
           AND (messages.created_at < ?2
                OR (messages.created_at = ?2 AND messages.rowid <= ?3))
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

type MessageRow = (String, String, String, String, i64, bool, i64);

fn messages_from_rows(
    rows: Vec<MessageRow>,
    mut variants: HashMap<String, Vec<MessageVariant>>,
) -> Vec<Message> {
    rows.into_iter()
        .map(
            |(id, chat_id, role, content, created_at, remembered, active_variant_index)| {
                let message_variants = if role == "assistant" {
                    variants.remove(&id).unwrap_or_default()
                } else {
                    Vec::new()
                };
                Message {
                    id,
                    chat_id,
                    role,
                    content,
                    created_at: clock_time(created_at),
                    remembered,
                    active_variant_index,
                    variants: message_variants,
                }
            },
        )
        .collect()
}

fn list_messages(connection: &Connection) -> CommandResult<Vec<Message>> {
    let variants = all_message_variants(connection)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
         FROM messages ORDER BY created_at ASC",
    )?;
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(messages_from_rows(rows, variants))
}

pub fn chat_state(connection: &Connection, chat_id: &str) -> CommandResult<ChatState> {
    Ok(ChatState {
        chat: get_chat(connection, chat_id)?,
        messages: messages_for_chat(connection, chat_id)?,
    })
}

fn list_galaxy_items(connection: &Connection) -> CommandResult<Vec<GalaxyItem>> {
    let mut statement = connection
        .prepare(
            "SELECT id, kind, name, description, data_json, badge, accent, updated_at
             FROM galaxy_items ORDER BY updated_at DESC",
        )?;
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
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CommandError::internal);
    result
}

fn list_providers(connection: &Connection) -> CommandResult<Vec<Provider>> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens
             FROM providers ORDER BY updated_at DESC",
        )?;
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
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CommandError::internal);
    result
}

fn get_settings(connection: &Connection) -> CommandResult<AppSettings> {
    connection
        .query_row(
            "SELECT profile_name, profile_avatar, animations, haptics,
                    compact_mode, send_on_enter, save_drafts,
                    interface_scale, sidebar_width, chat_sidebar_width,
                    sidebar_collapsed, theme_mode, theme_variant, language,
                    chat_view_mode, show_message_avatars,
                    show_message_timestamps, response_language
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
                    language: row.get(13)?,
                    chat_view_mode: row.get(14)?,
                    show_message_avatars: row.get::<_, i64>(15)? != 0,
                    show_message_timestamps: row.get::<_, i64>(16)? != 0,
                    response_language: row.get(17)?,
                })
            },
        )
        .map_err(CommandError::internal)
}

fn usage_history(connection: &Connection) -> CommandResult<Vec<UsagePoint>> {
    const DAY_SECONDS: i64 = 86_400;
    const MIN_HISTORY_DAYS: i64 = 42;

    let today = now_unix().div_euclid(DAY_SECONDS);
    let earliest_timestamp = connection
        .query_row("SELECT MIN(created_at) FROM usage_events", [], |row| {
            row.get::<_, Option<i64>>(0)
        })?;
    let first_day = earliest_timestamp
        .map(|timestamp| timestamp.div_euclid(DAY_SECONDS))
        .unwrap_or(today - (MIN_HISTORY_DAYS - 1))
        .min(today - (MIN_HISTORY_DAYS - 1))
        .min(today);

    let mut statement = connection
        .prepare(
            "SELECT created_at / ?1 AS usage_day,
                    COALESCE(SUM(input_tokens), 0),
                    COALESCE(SUM(output_tokens), 0),
                    COALESCE(SUM(request_count), 0)
             FROM usage_events
             WHERE created_at >= ?2
             GROUP BY usage_day
             ORDER BY usage_day",
        )?;
    let totals = statement
        .query_map(params![DAY_SECONDS, first_day * DAY_SECONDS], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                (
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ),
            ))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?;

    let mut points = Vec::with_capacity((today - first_day + 1) as usize);
    for day in first_day..=today {
        let (input_tokens, output_tokens, requests) =
            totals.get(&day).copied().unwrap_or_default();
        points.push(UsagePoint {
            day,
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
) -> CommandResult<()> {
    validate_chat_links(connection, input)?;
    let prompt_config = prompt_config_json(&input.prompt_config)?;
    let transaction = connection
        .unchecked_transaction()?;
    transaction
        .execute(
            "INSERT INTO chats (
                id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, universe_id, prompt_config_json
             ) VALUES (?1, ?2, '', ?3, 0, 0, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                input.title.trim(),
                now_unix(),
                input.provider_id,
                input.persona_id,
                input.character_id,
                input.universe_id,
                prompt_config,
            ],
        )?;
    replace_chat_worldbooks(&transaction, id, &input.worldbook_ids)?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn update_chat_config(
    connection: &Connection,
    chat_id: &str,
    input: &ChatConfigInput,
) -> CommandResult<()> {
    validate_chat_links(connection, input)?;
    let prompt_config = prompt_config_json(&input.prompt_config)?;
    let transaction = connection
        .unchecked_transaction()?;
    let changed = transaction
        .execute(
            "UPDATE chats SET title = ?1, provider_id = ?2, persona_id = ?3,
                    character_id = ?4, universe_id = ?5, prompt_config_json = ?6,
                    updated_at = ?7
             WHERE id = ?8",
            params![
                input.title.trim(),
                input.provider_id,
                input.persona_id,
                input.character_id,
                input.universe_id,
                prompt_config,
                now_unix(),
                chat_id,
            ],
        )?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    replace_chat_worldbooks(&transaction, chat_id, &input.worldbook_ids)?;
    transaction.commit().map_err(CommandError::internal)
}

fn replace_chat_worldbooks(
    connection: &Connection,
    chat_id: &str,
    worldbook_ids: &[String],
) -> CommandResult<()> {
    connection
        .execute("DELETE FROM chat_worldbooks WHERE chat_id = ?1", params![chat_id])?;
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
            )?;
    }
    Ok(())
}

fn validate_chat_links(connection: &Connection, input: &ChatConfigInput) -> CommandResult<()> {
    if input.title.trim().is_empty() {
        return Err(CommandError::new(keys::CHAT_TITLE_REQUIRED));
    }
    if input.title.chars().count() > 120 {
        return Err(CommandError::new(keys::CHAT_TITLE_TOO_LONG));
    }
    validate_optional_provider(connection, input.provider_id.as_deref())?;
    validate_optional_galaxy(connection, input.persona_id.as_deref(), "persona")?;
    validate_optional_galaxy(connection, input.character_id.as_deref(), "character")?;
    validate_optional_galaxy(connection, input.universe_id.as_deref(), "universe")?;
    for id in &input.worldbook_ids {
        validate_optional_galaxy(connection, Some(id), "worldbook")?;
    }
    for id in &input.prompt_config.set_ids {
        validate_optional_galaxy(connection, Some(id), "prompt-set")?;
    }
    validate_prompt_config(&input.prompt_config)?;
    Ok(())
}

fn validate_prompt_config(config: &PromptConfig) -> CommandResult<()> {
    const PRESETS: [&str; 9] = [
        "human",
        "casual-brief",
        "dialogue-only",
        "no-emoji",
        "first-person",
        "concise",
        "immersive",
        "initiative",
        "continuity",
    ];
    const PRIORITIES: [&str; 4] = ["low", "normal", "high", "critical"];

    if config.set_ids.len() > 16 {
        return Err(CommandError::new(keys::PROMPT_SET_LIMIT));
    }
    let mut set_ids = std::collections::HashSet::new();
    for id in &config.set_ids {
        if id.trim().is_empty() || !set_ids.insert(id.trim()) {
            return Err(CommandError::new(keys::PROMPT_SET_DUPLICATE));
        }
    }

    let mut preset_ids = std::collections::HashSet::new();
    for preset in &config.preset_ids {
        if !PRESETS.contains(&preset.as_str()) {
            return Err(CommandError::new(keys::PROMPT_RULE_UNKNOWN));
        }
        if !preset_ids.insert(preset) {
            return Err(CommandError::new(keys::PROMPT_RULE_DUPLICATE));
        }
    }

    let priorities = &config.context_priorities;
    for priority in [
        &priorities.persona,
        &priorities.character,
        &priorities.universe,
        &priorities.worldbooks,
        &priorities.remembered,
        &priorities.presets,
    ] {
        if !PRIORITIES.contains(&priority.as_str()) {
            return Err(CommandError::new(keys::PROMPT_PRIORITY_UNKNOWN));
        }
    }

    if config.custom_blocks.len() > 16 {
        return Err(CommandError::new(keys::PROMPT_BLOCK_LIMIT));
    }
    let mut block_ids = std::collections::HashSet::new();
    let mut total_length = 0;
    for block in &config.custom_blocks {
        if block.id.trim().is_empty()
            || block.id.chars().count() > 100
            || !block_ids.insert(block.id.trim())
        {
            return Err(CommandError::new(keys::PROMPT_BLOCK_ID_DUPLICATE));
        }
        if block.title.chars().count() > 80 {
            return Err(CommandError::new(keys::PROMPT_BLOCK_TITLE_TOO_LONG));
        }
        if block.enabled && block.title.trim().is_empty() {
            return Err(CommandError::new(keys::PROMPT_BLOCK_TITLE_REQUIRED));
        }
        if !PRIORITIES.contains(&block.priority.as_str()) {
            return Err(CommandError::new(keys::PROMPT_BLOCK_PRIORITY_UNKNOWN));
        }
        if block.enabled && block.content.trim().is_empty() {
            return Err(CommandError::new(keys::PROMPT_BLOCK_CONTENT_REQUIRED));
        }
        if block.content.chars().count() > 12_000 {
            return Err(CommandError::new(keys::PROMPT_BLOCK_TOO_LONG));
        }
        total_length += block.content.chars().count();
    }
    if total_length > 48_000 {
        return Err(CommandError::new(keys::PROMPT_BLOCKS_TOO_LARGE));
    }
    Ok(())
}

fn validate_optional_provider(connection: &Connection, id: Option<&str>) -> CommandResult<()> {
    if let Some(id) = id {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM providers WHERE id = ?1)",
                params![id],
                |row| row.get(0),
            )?;
        if !exists {
            return Err(CommandError::new(keys::PROVIDER_NOT_FOUND));
        }
    }
    Ok(())
}

fn context_object_not_found(kind: &str) -> CommandError {
    let key = match kind {
        "persona" => keys::GALAXY_CONTEXT_PERSONA_NOT_FOUND,
        "character" => keys::GALAXY_CONTEXT_CHARACTER_NOT_FOUND,
        "universe" => keys::GALAXY_CONTEXT_UNIVERSE_NOT_FOUND,
        "worldbook" => keys::GALAXY_CONTEXT_WORLDBOOK_NOT_FOUND,
        "style" => keys::GALAXY_CONTEXT_STYLE_NOT_FOUND,
        "prompt-set" => keys::GALAXY_CONTEXT_PROMPT_SET_NOT_FOUND,
        _ => keys::GALAXY_CONTEXT_OBJECT_NOT_FOUND,
    };
    CommandError::new(key)
}

fn validate_optional_galaxy(
    connection: &Connection,
    id: Option<&str>,
    kind: &str,
) -> CommandResult<()> {
    if let Some(id) = id {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM galaxy_items WHERE id = ?1 AND kind = ?2)",
                params![id, kind],
                |row| row.get(0),
            )?;
        if !exists {
            return Err(context_object_not_found(kind));
        }
    }
    Ok(())
}

pub fn rename_chat(connection: &Connection, chat_id: &str, title: &str) -> CommandResult<()> {
    let changed = connection
        .execute(
            "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now_unix(), chat_id],
        )?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn delete_chat(connection: &Connection, chat_id: &str) -> CommandResult<()> {
    let changed = connection
        .execute("DELETE FROM chats WHERE id = ?1", params![chat_id])?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn set_chat_pinned(
    connection: &Connection,
    chat_id: &str,
    pinned: bool,
) -> CommandResult<()> {
    let changed = connection
        .execute(
            "UPDATE chats SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
            params![pinned as i64, now_unix(), chat_id],
        )?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn clear_chat(connection: &Connection, chat_id: &str) -> CommandResult<()> {
    let transaction = connection
        .unchecked_transaction()?;
    let exists: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM chats WHERE id = ?1)",
            params![chat_id],
            |row| row.get(0),
        )?;
    if !exists {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    transaction
        .execute("DELETE FROM messages WHERE chat_id = ?1", params![chat_id])?;
    transaction
        .execute(
            "UPDATE chats SET preview = '', message_count = 0, updated_at = ?1 WHERE id = ?2",
            params![now_unix(), chat_id],
        )?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn messages_for_chat(connection: &Connection, chat_id: &str) -> CommandResult<Vec<Message>> {
    let variants = message_variants_for_chat(connection, chat_id)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
         FROM messages WHERE chat_id = ?1 ORDER BY created_at ASC",
    )?;
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
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(messages_from_rows(rows, variants))
}

pub fn messages_before_message(
    connection: &Connection,
    message_id: &str,
) -> CommandResult<(String, Vec<Message>)> {
    let (chat_id, created_at, role, message_rowid) = connection
        .query_row(
            "SELECT chat_id, created_at, role, rowid FROM messages WHERE id = ?1",
            params![message_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    if role != "assistant" {
        return Err(CommandError::new(keys::MESSAGE_REGENERATE_ASSISTANT_ONLY));
    }

    let variants =
        message_variants_before(connection, &chat_id, created_at, message_rowid)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
         FROM messages
         WHERE chat_id = ?1
           AND (created_at < ?2 OR (created_at = ?2 AND rowid < ?3))
         ORDER BY created_at ASC, rowid ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, i64>(6)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((chat_id, messages_from_rows(rows, variants)))
}

pub fn messages_through_message(
    connection: &Connection,
    message_id: &str,
) -> CommandResult<(String, Vec<Message>)> {
    let (chat_id, created_at, role, message_rowid) = connection
        .query_row(
            "SELECT chat_id, created_at, role, rowid FROM messages WHERE id = ?1",
            params![message_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    if role != "assistant" {
        return Err(CommandError::new(keys::MESSAGE_CONTINUE_ASSISTANT_ONLY));
    }

    let variants =
        message_variants_through(connection, &chat_id, created_at, message_rowid)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, remembered, active_variant_index
         FROM messages
         WHERE chat_id = ?1
           AND (created_at < ?2 OR (created_at = ?2 AND rowid <= ?3))
         ORDER BY created_at ASC, rowid ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, i64>(6)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((chat_id, messages_from_rows(rows, variants)))
}

fn next_message_timestamp(connection: &Connection, chat_id: &str) -> CommandResult<i64> {
    let latest = connection.query_row(
        "SELECT MAX(created_at) FROM messages WHERE chat_id = ?1",
        params![chat_id],
        |row| row.get::<_, Option<i64>>(0),
    )?;
    Ok(latest.map_or_else(now_unix, |value| now_unix().max(value + 1)))
}

pub fn add_user_message(
    connection: &Connection,
    chat_id: &str,
    message_id: &str,
    content: &str,
) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    let created_at = next_message_timestamp(&transaction, chat_id)?;
    transaction.execute(
        "INSERT INTO messages (id, chat_id, role, content, created_at)
         VALUES (?1, ?2, 'user', ?3, ?4)",
        params![message_id, chat_id, content, created_at],
    )?;
    transaction.execute(
        "UPDATE chats
         SET preview = ?1, updated_at = ?2, message_count = message_count + 1
         WHERE id = ?3",
        params![content, created_at, chat_id],
    )?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn add_assistant_message(
    connection: &Connection,
    chat_id: &str,
    message_id: &str,
    content: &str,
) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    let created_at = next_message_timestamp(&transaction, chat_id)?;
    transaction.execute(
        "INSERT INTO messages (id, chat_id, role, content, created_at, active_variant_index)
         VALUES (?1, ?2, 'assistant', ?3, ?4, 0)",
        params![message_id, chat_id, content, created_at],
    )?;
    transaction.execute(
        "INSERT INTO message_variants (id, message_id, position, content, created_at)
         VALUES (?1, ?2, 0, ?3, ?4)",
        params![format!("{message_id}-variant-0"), message_id, content, created_at],
    )?;
    transaction.execute(
        "UPDATE chats
         SET preview = ?1, updated_at = ?2, message_count = message_count + 1
         WHERE id = ?3",
        params![content, created_at, chat_id],
    )?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn append_message_variant(
    connection: &Connection,
    message_id: &str,
    variant_id: &str,
    content: &str,
) -> CommandResult<i64> {
    let transaction = connection
        .unchecked_transaction()?;
    let (chat_id, role) = transaction
        .query_row(
            "SELECT chat_id, role FROM messages WHERE id = ?1",
            params![message_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    if role != "assistant" {
        return Err(CommandError::new(keys::MESSAGE_VARIANTS_ASSISTANT_ONLY));
    }

    let next_position = transaction
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM message_variants WHERE message_id = ?1",
            params![message_id],
            |row| row.get::<_, i64>(0),
        )?;
    let now = now_unix();
    transaction
        .execute(
            "INSERT INTO message_variants (id, message_id, position, content, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![variant_id, message_id, next_position, content.trim(), now],
        )?;
    transaction
        .execute(
            "UPDATE messages SET content = ?1, active_variant_index = ?2 WHERE id = ?3",
            params![content.trim(), next_position, message_id],
        )?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.commit()?;
    Ok(next_position)
}

pub fn select_message_variant(
    connection: &Connection,
    message_id: &str,
    variant_index: i64,
) -> CommandResult<()> {
    let transaction = connection
        .unchecked_transaction()?;
    let (chat_id, content) = transaction
        .query_row(
            "SELECT messages.chat_id, message_variants.content
             FROM messages
             JOIN message_variants ON message_variants.message_id = messages.id
             WHERE messages.id = ?1 AND message_variants.position = ?2",
            params![message_id, variant_index],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_VARIANT_NOT_FOUND))?;
    transaction
        .execute(
            "UPDATE messages SET content = ?1, active_variant_index = ?2 WHERE id = ?3",
            params![content, variant_index, message_id],
        )?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn chat_provider_id(connection: &Connection, chat_id: &str) -> CommandResult<String> {
    connection
        .query_row(
            "SELECT provider_id FROM chats WHERE id = ?1",
            params![chat_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?
        .ok_or_else(|| CommandError::new(keys::PROVIDER_SELECT_FOR_CHAT))
}

pub fn clone_chat(
    connection: &Connection,
    source_chat_id: &str,
    new_chat_id: &str,
    title: &str,
    include_messages: bool,
    through_message_id: Option<&str>,
) -> CommandResult<String> {
    let source = connection
        .query_row(
            "SELECT provider_id, persona_id, character_id, universe_id, prompt_config_json
             FROM chats WHERE id = ?1",
            params![source_chat_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?;

    let title = title.trim();
    if title.is_empty() {
        return Err(CommandError::new(keys::CHAT_TITLE_REQUIRED));
    }
    if title.chars().count() > 120 {
        return Err(CommandError::new(keys::CHAT_TITLE_TOO_LONG));
    }
    let now = now_unix();
    let transaction = connection
        .unchecked_transaction()?;

    transaction
        .execute(
            "INSERT INTO chats (
                id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, universe_id, prompt_config_json
             ) VALUES (?1, ?2, '', ?3, 0, 0, ?4, ?5, ?6, ?7, ?8)",
            params![
                new_chat_id,
                title,
                now,
                source.0,
                source.1,
                source.2,
                source.3,
                source.4,
            ],
        )?;

    transaction
        .execute(
            "INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
             SELECT ?1, worldbook_id, position
             FROM chat_worldbooks WHERE chat_id = ?2",
            params![new_chat_id, source_chat_id],
        )?;

    if include_messages || through_message_id.is_some() {
        let cutoff = match through_message_id {
            Some(message_id) => Some(
                transaction
                    .query_row(
                        "SELECT created_at FROM messages WHERE id = ?1 AND chat_id = ?2",
                        params![message_id, source_chat_id],
                        |row| row.get::<_, i64>(0),
                    )
                    .optional()?
                    .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?,
            ),
            None => None,
        };

        let mut statement = transaction
            .prepare(
                "SELECT id, role, content, created_at, remembered, active_variant_index
                 FROM messages
                 WHERE chat_id = ?1 AND (?2 IS NULL OR created_at <= ?2)
                 ORDER BY created_at ASC",
            )?;
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
            })?
            .collect::<Result<Vec<_>, _>>()?;
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
                )?;

            if role == "assistant" {
                let mut variant_statement = transaction
                    .prepare(
                        "SELECT position, content, created_at
                         FROM message_variants WHERE message_id = ?1 ORDER BY position ASC",
                    )?;
                let variants = variant_statement
                    .query_map(params![source_message_id], |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, i64>(2)?,
                        ))
                    })?
                    .collect::<Result<Vec<_>, _>>()?;
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
                        )?;
                }
            }
        }
        refresh_chat_summary(&transaction, new_chat_id)?;
    }

    transaction.commit()?;
    Ok(title.to_owned())
}

pub fn edit_message(
    connection: &Connection,
    message_id: &str,
    variant_id: &str,
    content: &str,
) -> CommandResult<()> {
    let (chat_id, role) = connection
        .query_row(
            "SELECT chat_id, role FROM messages WHERE id = ?1",
            params![message_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;

    if role == "assistant" {
        append_message_variant(connection, message_id, variant_id, content)?;
        return Ok(());
    }

    let changed = connection
        .execute(
            "UPDATE messages SET content = ?1 WHERE id = ?2",
            params![content.trim(), message_id],
        )?;
    if changed == 0 {
        return Err(CommandError::new(keys::MESSAGE_NOT_FOUND));
    }
    refresh_chat_summary(connection, &chat_id)
}

pub fn delete_message(connection: &Connection, message_id: &str) -> CommandResult<()> {
    let chat_id = connection
        .query_row(
            "SELECT chat_id FROM messages WHERE id = ?1",
            params![message_id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    connection
        .execute("DELETE FROM messages WHERE id = ?1", params![message_id])?;
    refresh_chat_summary(connection, &chat_id)
}

pub fn set_message_remembered(
    connection: &Connection,
    message_id: &str,
    remembered: bool,
) -> CommandResult<()> {
    let changed = connection
        .execute(
            "UPDATE messages SET remembered = ?1 WHERE id = ?2",
            params![remembered as i64, message_id],
        )?;
    if changed == 0 {
        return Err(CommandError::new(keys::MESSAGE_NOT_FOUND));
    }
    Ok(())
}

fn refresh_chat_summary(connection: &Connection, chat_id: &str) -> CommandResult<()> {
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
        )?;
    connection
        .execute(
            "UPDATE chats SET preview = ?1, message_count = ?2, updated_at = ?3 WHERE id = ?4",
            params![preview, message_count, updated_at, chat_id],
        )?;
    Ok(())
}

pub fn provider_optional(connection: &Connection, id: &str) -> CommandResult<Option<Provider>> {
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
        .map_err(CommandError::internal)
}

pub fn get_provider(connection: &Connection, id: &str) -> CommandResult<Provider> {
    provider_optional(connection, id)?
        .ok_or_else(|| CommandError::new(keys::PROVIDER_NOT_FOUND))
}

pub fn upsert_galaxy_item(
    connection: &Connection,
    id: &str,
    input: &GalaxyItemInput,
) -> CommandResult<GalaxyItem> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(CommandError::new(keys::COMMON_NAME_REQUIRED));
    }
    if name.chars().count() > 120 {
        return Err(CommandError::new(keys::COMMON_NAME_TOO_LONG));
    }
    if !input.data.is_object() {
        return Err(CommandError::new(keys::GALAXY_DATA_MUST_BE_OBJECT));
    }
    validate_galaxy_data(connection, input)?;

    let existing_kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    if existing_kind
        .as_deref()
        .is_some_and(|kind| kind != input.kind.as_str())
    {
        return Err(CommandError::new(keys::GALAXY_KIND_IMMUTABLE));
    }

    let (badge, accent) = galaxy_presentation(&input.kind)?;
    let now = now_unix();
    let data_json = serde_json::to_string(&input.data)?;
    if data_json.len() > 1_000_000 {
        return Err(CommandError::new(keys::GALAXY_DATA_TOO_LARGE));
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
        )?;
    Ok(GalaxyItem {
        id: id.into(),
        kind: input.kind.clone(),
        name: name.into(),
        description: input.description.trim().into(),
        data: input.data.clone(),
        badge: badge.into(),
        accent: accent.into(),
        updated_at: now,
    })
}

fn validate_galaxy_data(
    connection: &Connection,
    input: &GalaxyItemInput,
) -> CommandResult<()> {
    if input.kind == "prompt-set" {
        let config = serde_json::from_value::<PromptConfig>(input.data.clone())
            .map_err(|_| CommandError::new(keys::PROMPT_SET_INVALID))?;
        if !config.set_ids.is_empty() {
            return Err(CommandError::new(keys::PROMPT_SET_NESTED_NOT_ALLOWED));
        }
        return validate_prompt_config(&config);
    }

    if input.kind == "character" {
        let preset = input
            .data
            .get("stylePreset")
            .and_then(Value::as_str)
            .unwrap_or("neutral");
        if !matches!(
            preset,
            "neutral" | "warm" | "concise" | "roleplay" | "literary" | "custom"
        ) {
            return Err(CommandError::new(keys::GALAXY_STYLE_PRESET_UNKNOWN));
        }

        if preset == "custom" {
            let style_id = input
                .data
                .get("styleItemId")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| CommandError::new(keys::GALAXY_SAVED_STYLE_REQUIRED))?;
            validate_optional_galaxy(connection, Some(style_id), "style")?;
        }

        if let Some(ids) = input.data.get("promptSetIds").and_then(Value::as_array) {
            for id in ids {
                let id = id
                    .as_str()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| CommandError::new(keys::GALAXY_PROMPT_SET_REFERENCE_INVALID))?;
                validate_optional_galaxy(connection, Some(id), "prompt-set")?;
            }
        }
    }

    Ok(())
}

pub fn get_chat_prompt_context(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<ChatPromptContext> {
    let (persona_id, character_id, universe_id, raw_prompt_config, legacy_preset): (
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        String,
    ) = connection
        .query_row(
            "SELECT persona_id, character_id, universe_id, prompt_config_json, response_preset
             FROM chats WHERE id = ?1",
            params![chat_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?;

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

    let prompt_config = parse_prompt_config(&raw_prompt_config, &legacy_preset);
    let mut prompt_set_ids = prompt_config.set_ids.clone();
    if let Some(ids) = character
        .as_ref()
        .and_then(|item| item.data.get("promptSetIds"))
        .and_then(Value::as_array)
    {
        prompt_set_ids.extend(ids.iter().filter_map(Value::as_str).map(str::to_owned));
    }
    let mut seen_prompt_sets = std::collections::HashSet::new();
    let prompt_sets = prompt_set_ids
        .iter()
        .filter(|id| seen_prompt_sets.insert(id.as_str()))
        .filter_map(|id| get_galaxy_item(connection, id).ok())
        .filter(|item| item.kind == "prompt-set")
        .collect();

    Ok(ChatPromptContext {
        persona,
        character,
        universe,
        worldbooks,
        character_style,
        prompt_sets,
        prompt_config,
    })
}

fn get_galaxy_item(connection: &Connection, id: &str) -> CommandResult<GalaxyItem> {
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
                    updated_at: row.get(7)?,
                })
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::GALAXY_NOT_FOUND))
}

pub fn delete_galaxy_item(connection: &Connection, id: &str) -> CommandResult<()> {
    let kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::GALAXY_NOT_FOUND))?;

    let transaction = connection
        .unchecked_transaction()?;
    transaction
        .execute("UPDATE chats SET persona_id = NULL WHERE persona_id = ?1", params![id])?;
    transaction
        .execute("UPDATE chats SET character_id = NULL WHERE character_id = ?1", params![id])?;
    transaction
        .execute("UPDATE chats SET universe_id = NULL WHERE universe_id = ?1", params![id])?;
    transaction
        .execute("DELETE FROM chat_worldbooks WHERE worldbook_id = ?1", params![id])?;

    if kind == "style" {
        clear_character_style_references(&transaction, id)?;
    }
    if kind == "prompt-set" {
        clear_prompt_set_references(&transaction, id)?;
    }

    transaction
        .execute("DELETE FROM galaxy_items WHERE id = ?1", params![id])?;
    transaction.commit().map_err(CommandError::internal)
}

fn clear_character_style_references(
    connection: &Connection,
    style_id: &str,
) -> CommandResult<()> {
    let mut statement = connection
        .prepare("SELECT id, data_json FROM galaxy_items WHERE kind = 'character'")?;
    let rows = statement
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
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
        let updated = serde_json::to_string(&data)?;
        connection
            .execute(
                "UPDATE galaxy_items SET data_json = ?1, updated_at = ?2 WHERE id = ?3",
                params![updated, now_unix(), character_id],
            )?;
    }

    Ok(())
}

fn clear_prompt_set_references(
    connection: &Connection,
    prompt_set_id: &str,
) -> CommandResult<()> {
    let mut statement = connection
        .prepare("SELECT id, data_json FROM galaxy_items WHERE kind = 'character'")?;
    let characters = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (character_id, data_json) in characters {
        let mut data = serde_json::from_str::<Value>(&data_json)
            .unwrap_or(Value::Object(Default::default()));
        let Some(ids) = data.get_mut("promptSetIds").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = ids.len();
        ids.retain(|value| value.as_str() != Some(prompt_set_id));
        if ids.len() == before {
            continue;
        }
        connection
            .execute(
                "UPDATE galaxy_items SET data_json = ?1, updated_at = ?2 WHERE id = ?3",
                params![
                    serde_json::to_string(&data)?,
                    now_unix(),
                    character_id
                ],
            )?;
    }

    let mut statement = connection
        .prepare("SELECT id, prompt_config_json, response_preset FROM chats")?;
    let chats = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (chat_id, raw_config, legacy_preset) in chats {
        let mut config = parse_prompt_config(&raw_config, &legacy_preset);
        let before = config.set_ids.len();
        config.set_ids.retain(|id| id != prompt_set_id);
        if config.set_ids.len() == before {
            continue;
        }
        connection
            .execute(
                "UPDATE chats SET prompt_config_json = ?1 WHERE id = ?2",
                params![prompt_config_json(&config)?, chat_id],
            )?;
    }
    Ok(())
}

pub fn save_provider(connection: &Connection, provider: &Provider) -> CommandResult<()> {
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
        )?;
    Ok(())
}

pub fn delete_provider_record(connection: &Connection, id: &str) -> CommandResult<()> {
    connection.execute("DELETE FROM providers WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_provider_health(
    connection: &Connection,
    id: &str,
    status: &str,
    latency_ms: Option<i64>,
) -> CommandResult<()> {
    connection
        .execute(
            "UPDATE providers SET status = ?1, latency_ms = ?2, updated_at = ?3 WHERE id = ?4",
            params![status, latency_ms, now_unix(), id],
        )?;
    Ok(())
}

pub fn delete_provider(connection: &Connection, id: &str) -> CommandResult<()> {
    let transaction = connection
        .unchecked_transaction()?;
    transaction
        .execute(
            "UPDATE chats SET provider_id = NULL WHERE provider_id = ?1",
            params![id],
        )?;
    transaction
        .execute("DELETE FROM providers WHERE id = ?1", params![id])?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn record_usage(
    connection: &Connection,
    id: &str,
    provider_id: &str,
    model: &str,
    input_tokens: i64,
    output_tokens: i64,
) -> CommandResult<()> {
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
        )?;
    Ok(())
}

pub fn update_settings(connection: &Connection, settings: &AppSettings) -> CommandResult<()> {
    connection
        .execute(
            "UPDATE app_settings
             SET profile_name = ?1, profile_avatar = ?2,
                 animations = ?3, haptics = ?4, compact_mode = ?5,
                 send_on_enter = ?6, save_drafts = ?7, interface_scale = ?8,
                 sidebar_width = ?9, chat_sidebar_width = ?10,
                 sidebar_collapsed = ?11, theme_mode = ?12, theme_variant = ?13,
                 language = ?14, chat_view_mode = ?15,
                 show_message_avatars = ?16, show_message_timestamps = ?17,
                 response_language = ?18
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
                settings.theme_variant,
                settings.language,
                settings.chat_view_mode,
                settings.show_message_avatars as i64,
                settings.show_message_timestamps as i64,
                settings.response_language
            ],
        )?;
    Ok(())
}

fn galaxy_presentation(kind: &str) -> CommandResult<(&'static str, &'static str)> {
    match kind {
        "persona" => Ok(("galaxy.kind.persona", "slate")),
        "character" => Ok(("galaxy.kind.character", "blue")),
        "universe" => Ok(("galaxy.kind.universe", "indigo")),
        "worldbook" => Ok(("galaxy.kind.worldbook", "amber")),
        "style" => Ok(("galaxy.kind.style", "violet")),
        "prompt-set" => Ok(("galaxy.kind.promptSet", "emerald")),
        _ => Err(CommandError::new(keys::GALAXY_KIND_UNKNOWN)),
    }
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn clock_time(timestamp: i64) -> String {
    let seconds_in_day = timestamp.rem_euclid(86_400);
    let hours = seconds_in_day / 3_600;
    let minutes = (seconds_in_day % 3_600) / 60;
    format!("{hours:02}:{minutes:02}")
}

#[cfg(test)]
#[path = "../../test/rust/db.rs"]
mod tests;
