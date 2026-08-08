mod ai_memory;
mod galaxy;
mod settings;

use std::{
    collections::{HashMap, HashSet},
    path::Path,
};

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    AppSnapshot, Chat, ChatConfigInput, ChatModuleOverrides, ChatPromptContext, ChatState, GalaxyItem, Message,
    MessageVariant, PromptConfig, Provider,
};

use ai_memory::clear_chat_ai_context;
pub(crate) use ai_memory::{
    get_dynamic_context, invalidate_chat_ai_context, list_semantic_memories,
    prune_semantic_memories, save_dynamic_context, semantic_memory_indexed_contents,
    upsert_semantic_memories,
};
use galaxy::get_galaxy_item;
pub(crate) use galaxy::{delete_galaxy_item, upsert_galaxy_item};
pub(crate) use settings::{get_settings, provider_ids, update_settings, usage_history};

pub fn open(path: &Path) -> CommandResult<Connection> {
    let connection = Connection::open(path)?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&connection)?;
    remove_legacy_preview_data(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> CommandResult<()> {
    connection.execute_batch(
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
                style_item_id TEXT,
                universe_id TEXT,
                response_preset TEXT NOT NULL DEFAULT 'natural',
                prompt_config_json TEXT NOT NULL DEFAULT '{}',
                module_overrides_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                edited INTEGER NOT NULL DEFAULT 0,
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
                edited INTEGER NOT NULL DEFAULT 0,
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
                embedding_model TEXT,
                embedding_base_url TEXT,
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
                focus_composer_after_send INTEGER NOT NULL DEFAULT 1,
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
                language TEXT NOT NULL DEFAULT 'system',
                ai_modules_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS chat_contexts (
                chat_id TEXT PRIMARY KEY,
                context_json TEXT NOT NULL DEFAULT '{}',
                covered_through_message_id TEXT,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS semantic_memories (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                source_kind TEXT NOT NULL,
                source_id TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                embedding_provider_id TEXT NOT NULL,
                embedding_model TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(chat_id, source_kind, source_id),
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
                FOREIGN KEY(embedding_provider_id) REFERENCES providers(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_semantic_memories_lookup
                ON semantic_memories(chat_id, embedding_provider_id, embedding_model);

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
    ensure_column(connection, "chats", "style_item_id", "TEXT")?;
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
        "chats",
        "module_overrides_json",
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
        "messages",
        "updated_at",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "messages",
        "edited",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "message_variants",
        "edited",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    connection.execute(
        "UPDATE messages SET updated_at = created_at WHERE updated_at = 0",
        [],
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
    connection.execute(
        "UPDATE messages
         SET edited = COALESCE((
             SELECT variants.edited
             FROM message_variants variants
             WHERE variants.message_id = messages.id
               AND variants.position = messages.active_variant_index
         ), 0)
         WHERE role = 'assistant'",
        [],
    )?;
    ensure_column(
        connection,
        "galaxy_items",
        "data_json",
        "TEXT NOT NULL DEFAULT '{}'",
    )?;
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
    ensure_column(connection, "providers", "embedding_model", "TEXT")?;
    ensure_column(connection, "providers", "embedding_base_url", "TEXT")?;
    ensure_column(
        connection,
        "app_settings",
        "focus_composer_after_send",
        "INTEGER NOT NULL DEFAULT 1",
    )?;
    ensure_column(
        connection,
        "app_settings",
        "ai_modules_json",
        "TEXT NOT NULL DEFAULT '{}'",
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
    connection.execute_batch(
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
    connection.execute_batch(
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
    let mut statement =
        connection.prepare("SELECT id, response_preset, prompt_config_json FROM chats")?;
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
        connection.execute(
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

fn parse_module_overrides(raw: &str) -> ChatModuleOverrides {
    serde_json::from_str(raw).unwrap_or_default()
}

fn module_overrides_json(overrides: &ChatModuleOverrides) -> CommandResult<String> {
    Ok(serde_json::to_string(overrides)?)
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> CommandResult<()> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    if !columns.iter().any(|name| name == column) {
        connection.execute_batch(&format!(
            "ALTER TABLE {table} ADD COLUMN {column} {definition}"
        ))?;
    }
    Ok(())
}

fn remove_legacy_preview_data(connection: &Connection) -> CommandResult<()> {
    connection.execute_batch(
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
                persona_id, character_id, style_item_id, universe_id, prompt_config_json, module_overrides_json, response_preset
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
                row.get::<_, Option<String>>(10)?,
                row.get::<_, String>(11)?,
                row.get::<_, String>(12)?,
                row.get::<_, String>(13)?,
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
                style_item_id,
                universe_id,
                prompt_config_json,
                module_overrides_json,
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
                style_item_id,
                universe_id,
                prompt_config: parse_prompt_config(&prompt_config_json, &legacy_preset),
                module_overrides: parse_module_overrides(&module_overrides_json),
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
                    persona_id, character_id, style_item_id, universe_id, prompt_config_json, module_overrides_json, response_preset
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
                    row.get::<_, Option<String>>(10)?,
                    row.get::<_, String>(11)?,
                    row.get::<_, String>(12)?,
                    row.get::<_, String>(13)?,
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
        style_item_id: row.9,
        universe_id: row.10,
        prompt_config: parse_prompt_config(&row.11, &row.13),
        module_overrides: parse_module_overrides(&row.12),
        worldbook_ids: worldbook_ids_for_chat(connection, &row.0)?,
    })
}

type MessageVariantRow = (String, String, i64, String, i64, bool);

fn variants_from_rows(rows: Vec<MessageVariantRow>) -> HashMap<String, Vec<MessageVariant>> {
    let mut result: HashMap<String, Vec<MessageVariant>> = HashMap::new();
    for (message_id, id, index, content, created_at, edited) in rows {
        result.entry(message_id).or_default().push(MessageVariant {
            id,
            index,
            content,
            created_at,
            edited,
        });
    }
    result
}

fn all_message_variants(
    connection: &Connection,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT message_id, id, position, content, created_at, edited
         FROM message_variants ORDER BY message_id, position ASC",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get::<_, i64>(5)? != 0,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

fn message_variants_for_chat(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<HashMap<String, Vec<MessageVariant>>> {
    let mut statement = connection.prepare(
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at, variants.edited
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get::<_, i64>(5)? != 0,
            ))
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
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at, variants.edited
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
           AND (messages.created_at < ?2
                OR (messages.created_at = ?2 AND messages.rowid < ?3))
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get::<_, i64>(5)? != 0,
            ))
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
        "SELECT variants.message_id, variants.id, variants.position, variants.content, variants.created_at, variants.edited
         FROM message_variants variants
         INNER JOIN messages ON messages.id = variants.message_id
         WHERE messages.chat_id = ?1
           AND (messages.created_at < ?2
                OR (messages.created_at = ?2 AND messages.rowid <= ?3))
         ORDER BY variants.message_id, variants.position ASC",
    )?;
    let rows = statement
        .query_map(params![chat_id, created_at, message_rowid], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get::<_, i64>(5)? != 0,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(variants_from_rows(rows))
}

type MessageRow = (String, String, String, String, i64, i64, bool, bool, i64);

fn messages_from_rows(
    rows: Vec<MessageRow>,
    mut variants: HashMap<String, Vec<MessageVariant>>,
) -> Vec<Message> {
    rows.into_iter()
        .map(
            |(
                id,
                chat_id,
                role,
                content,
                created_at,
                updated_at,
                edited,
                remembered,
                active_variant_index,
            )| {
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
                    created_at,
                    updated_at,
                    edited,
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
        "SELECT id, chat_id, role, content, created_at, updated_at, edited, remembered, active_variant_index
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
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)? != 0,
                row.get::<_, i64>(7)? != 0,
                row.get::<_, i64>(8)?,
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
    let mut statement = connection.prepare(
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
    let mut statement = connection.prepare(
        "SELECT id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens, embedding_model, embedding_base_url
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
                embedding_model: row.get(11)?,
                embedding_base_url: row.get(12)?,
                has_secret: false,
            })
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(CommandError::internal);
    result
}

pub fn create_chat(
    connection: &Connection,
    id: &str,
    input: &ChatConfigInput,
) -> CommandResult<String> {
    validate_chat_links(connection, input, false)?;
    let title = resolve_new_chat_title(connection, input)?;
    let prompt_config = prompt_config_json(&input.prompt_config)?;
    let module_overrides = module_overrides_json(&input.module_overrides)?;
    let greeting = input
        .greeting_message
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let created_at = now_unix();
    let transaction = connection.unchecked_transaction()?;
    transaction.execute(
        "INSERT INTO chats (
            id, title, preview, updated_at, message_count, pinned, provider_id,
            persona_id, character_id, style_item_id, universe_id, prompt_config_json, module_overrides_json
         ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            id,
            &title,
            greeting.unwrap_or(""),
            created_at,
            if greeting.is_some() { 1_i64 } else { 0_i64 },
            input.provider_id,
            input.persona_id,
            input.character_id,
            input.style_item_id,
            input.universe_id,
            prompt_config,
            module_overrides,
        ],
    )?;
    replace_chat_worldbooks(&transaction, id, &input.worldbook_ids)?;

    if let Some(greeting) = greeting {
        let message_id = format!("{id}-greeting");
        transaction.execute(
            "INSERT INTO messages (
                id, chat_id, role, content, created_at, updated_at, active_variant_index
             ) VALUES (?1, ?2, 'assistant', ?3, ?4, ?4, 0)",
            params![&message_id, id, greeting, created_at],
        )?;
        transaction.execute(
            "INSERT INTO message_variants (
                id, message_id, position, content, created_at, edited
             ) VALUES (?1, ?2, 0, ?3, ?4, 0)",
            params![
                format!("{message_id}-variant-0"),
                &message_id,
                greeting,
                created_at
            ],
        )?;
    }

    transaction.commit().map_err(CommandError::internal)?;
    Ok(title)
}

pub fn update_chat_config(
    connection: &Connection,
    chat_id: &str,
    input: &ChatConfigInput,
) -> CommandResult<()> {
    validate_chat_links(connection, input, true)?;
    let prompt_config = prompt_config_json(&input.prompt_config)?;
    let module_overrides = module_overrides_json(&input.module_overrides)?;
    let transaction = connection.unchecked_transaction()?;
    let changed = transaction.execute(
        "UPDATE chats SET title = ?1, provider_id = ?2, persona_id = ?3,
                    character_id = ?4, style_item_id = ?5, universe_id = ?6,
                    prompt_config_json = ?7, module_overrides_json = ?8, updated_at = ?9
             WHERE id = ?10",
        params![
            input.title.trim(),
            input.provider_id,
            input.persona_id,
            input.character_id,
            input.style_item_id,
            input.universe_id,
            prompt_config,
            module_overrides,
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
    connection.execute(
        "DELETE FROM chat_worldbooks WHERE chat_id = ?1",
        params![chat_id],
    )?;
    let mut inserted = std::collections::HashSet::new();
    for worldbook_id in worldbook_ids {
        if !inserted.insert(worldbook_id) {
            continue;
        }
        let position = inserted.len().saturating_sub(1) as i64;
        connection.execute(
            "INSERT INTO chat_worldbooks (chat_id, worldbook_id, position) VALUES (?1, ?2, ?3)",
            params![chat_id, worldbook_id, position],
        )?;
    }
    Ok(())
}

fn resolve_new_chat_title(
    connection: &Connection,
    input: &ChatConfigInput,
) -> CommandResult<String> {
    let explicit = input.title.trim();
    if !explicit.is_empty() {
        return Ok(explicit.to_owned());
    }

    let (base_name, existing_count): (String, i64) =
        if let Some(character_id) = input.character_id.as_deref() {
            let character_name = connection.query_row(
                "SELECT name FROM galaxy_items WHERE id = ?1 AND kind = 'character'",
                params![character_id],
                |row| row.get::<_, String>(0),
            )?;
            let count = connection.query_row(
                "SELECT COUNT(*) FROM chats WHERE character_id = ?1",
                params![character_id],
                |row| row.get::<_, i64>(0),
            )?;
            (character_name, count)
        } else {
            let count = connection.query_row(
                "SELECT COUNT(*) FROM chats WHERE character_id IS NULL",
                [],
                |row| row.get::<_, i64>(0),
            )?;
            ("Chat".to_owned(), count)
        };

    let mut sequence = existing_count + 1;
    loop {
        let suffix = format!(" #{sequence}");
        let max_base_chars = 120usize.saturating_sub(suffix.chars().count());
        let mut base = base_name
            .trim()
            .chars()
            .take(max_base_chars)
            .collect::<String>();
        if base.is_empty() {
            base = "Chat".chars().take(max_base_chars).collect();
        }
        let candidate = format!("{base}{suffix}");
        let exists = if let Some(character_id) = input.character_id.as_deref() {
            connection.query_row(
                "SELECT EXISTS(SELECT 1 FROM chats WHERE title = ?1 AND character_id = ?2)",
                params![&candidate, character_id],
                |row| row.get::<_, bool>(0),
            )?
        } else {
            connection.query_row(
                "SELECT EXISTS(SELECT 1 FROM chats WHERE title = ?1 AND character_id IS NULL)",
                params![&candidate],
                |row| row.get::<_, bool>(0),
            )?
        };
        if !exists {
            return Ok(candidate);
        }
        sequence += 1;
    }
}

fn validate_chat_links(
    connection: &Connection,
    input: &ChatConfigInput,
    require_title: bool,
) -> CommandResult<()> {
    let title = input.title.trim();
    if require_title && title.is_empty() {
        return Err(CommandError::new(keys::CHAT_TITLE_REQUIRED));
    }
    if title.chars().count() > 120 {
        return Err(CommandError::new(keys::CHAT_TITLE_TOO_LONG));
    }
    if input
        .greeting_message
        .as_deref()
        .is_some_and(|value| value.trim().chars().count() > 12_000)
    {
        return Err(CommandError::new(keys::CHAT_GREETING_TOO_LONG));
    }
    validate_optional_provider(connection, input.provider_id.as_deref())?;
    validate_optional_galaxy(connection, input.persona_id.as_deref(), "persona")?;
    validate_optional_galaxy(connection, input.character_id.as_deref(), "character")?;
    validate_optional_galaxy(connection, input.style_item_id.as_deref(), "style")?;
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
    if config.recent_message_limit > 500 {
        return Err(CommandError::new(keys::CHAT_RECENT_MESSAGE_LIMIT_RANGE));
    }
    const PRESETS: [&str; 16] = [
        "human",
        "casual-brief",
        "casual-lowercase",
        "strict-lowercase",
        "dialogue-only",
        "no-emoji",
        "first-person",
        "concise",
        "immersive",
        "initiative",
        "continuity",
        "roleplay-actions",
        "no-user-control",
        "character-consistency",
        "scene-pacing",
        "telegram-chat",
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
        let exists: bool = connection.query_row(
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
        let exists: bool = connection.query_row(
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
    let changed = connection.execute(
        "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![title, now_unix(), chat_id],
    )?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn delete_chat(connection: &Connection, chat_id: &str) -> CommandResult<()> {
    let changed = connection.execute("DELETE FROM chats WHERE id = ?1", params![chat_id])?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn set_chat_pinned(connection: &Connection, chat_id: &str, pinned: bool) -> CommandResult<()> {
    let changed = connection.execute(
        "UPDATE chats SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
        params![pinned as i64, now_unix(), chat_id],
    )?;
    if changed == 0 {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    Ok(())
}

pub fn clear_chat(connection: &Connection, chat_id: &str) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    let exists: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM chats WHERE id = ?1)",
        params![chat_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(CommandError::new(keys::CHAT_NOT_FOUND));
    }
    transaction.execute("DELETE FROM messages WHERE chat_id = ?1", params![chat_id])?;
    transaction.execute(
        "DELETE FROM chat_contexts WHERE chat_id = ?1",
        params![chat_id],
    )?;
    transaction.execute(
        "DELETE FROM semantic_memories WHERE chat_id = ?1",
        params![chat_id],
    )?;
    transaction.execute(
        "UPDATE chats SET preview = '', message_count = 0, updated_at = ?1 WHERE id = ?2",
        params![now_unix(), chat_id],
    )?;
    transaction.commit().map_err(CommandError::internal)
}

pub fn messages_for_chat(connection: &Connection, chat_id: &str) -> CommandResult<Vec<Message>> {
    let variants = message_variants_for_chat(connection, chat_id)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, updated_at, edited, remembered, active_variant_index
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
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)? != 0,
                row.get::<_, i64>(7)? != 0,
                row.get::<_, i64>(8)?,
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

    let variants = message_variants_before(connection, &chat_id, created_at, message_rowid)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, updated_at, edited, remembered, active_variant_index
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
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)? != 0,
                row.get::<_, i64>(7)? != 0,
                row.get::<_, i64>(8)?,
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

    let variants = message_variants_through(connection, &chat_id, created_at, message_rowid)?;
    let mut statement = connection.prepare(
        "SELECT id, chat_id, role, content, created_at, updated_at, edited, remembered, active_variant_index
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
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)? != 0,
                row.get::<_, i64>(7)? != 0,
                row.get::<_, i64>(8)?,
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
        "INSERT INTO messages (id, chat_id, role, content, created_at, updated_at)
         VALUES (?1, ?2, 'user', ?3, ?4, ?4)",
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
        "INSERT INTO messages (
            id, chat_id, role, content, created_at, updated_at, active_variant_index
         ) VALUES (?1, ?2, 'assistant', ?3, ?4, ?4, 0)",
        params![message_id, chat_id, content, created_at],
    )?;
    transaction.execute(
        "INSERT INTO message_variants (
            id, message_id, position, content, created_at, edited
         ) VALUES (?1, ?2, 0, ?3, ?4, 0)",
        params![
            format!("{message_id}-variant-0"),
            message_id,
            content,
            created_at
        ],
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
    edited: bool,
) -> CommandResult<i64> {
    let transaction = connection.unchecked_transaction()?;
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

    let next_position = transaction.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM message_variants WHERE message_id = ?1",
        params![message_id],
        |row| row.get::<_, i64>(0),
    )?;
    let now = now_unix();
    transaction.execute(
        "INSERT INTO message_variants (
                id, message_id, position, content, created_at, edited
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            variant_id,
            message_id,
            next_position,
            content.trim(),
            now,
            edited as i64,
        ],
    )?;
    transaction.execute(
        "UPDATE messages
             SET content = ?1, active_variant_index = ?2, updated_at = ?3, edited = ?4
             WHERE id = ?5",
        params![
            content.trim(),
            next_position,
            now,
            edited as i64,
            message_id
        ],
    )?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.execute(
        "DELETE FROM chat_contexts WHERE chat_id = ?1",
        params![chat_id],
    )?;
    transaction.execute(
        "DELETE FROM semantic_memories WHERE chat_id = ?1",
        params![chat_id],
    )?;
    transaction.commit()?;
    Ok(next_position)
}

pub fn select_message_variant(
    connection: &Connection,
    message_id: &str,
    variant_index: i64,
) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    let (chat_id, content, edited) = transaction
        .query_row(
            "SELECT messages.chat_id, message_variants.content, message_variants.edited
             FROM messages
             JOIN message_variants ON message_variants.message_id = messages.id
             WHERE messages.id = ?1 AND message_variants.position = ?2",
            params![message_id, variant_index],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)? != 0,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_VARIANT_NOT_FOUND))?;
    transaction.execute(
        "UPDATE messages
             SET content = ?1, active_variant_index = ?2, updated_at = ?3, edited = ?4
             WHERE id = ?5",
        params![
            content,
            variant_index,
            now_unix(),
            edited as i64,
            message_id
        ],
    )?;
    refresh_chat_summary(&transaction, &chat_id)?;
    transaction.execute(
        "DELETE FROM chat_contexts WHERE chat_id = ?1",
        params![chat_id],
    )?;
    transaction.execute(
        "DELETE FROM semantic_memories WHERE chat_id = ?1",
        params![chat_id],
    )?;
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
            "SELECT provider_id, persona_id, character_id, style_item_id, universe_id, prompt_config_json, module_overrides_json
             FROM chats WHERE id = ?1",
            params![source_chat_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
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
    let transaction = connection.unchecked_transaction()?;

    transaction.execute(
        "INSERT INTO chats (
                id, title, preview, updated_at, message_count, pinned, provider_id,
                persona_id, character_id, style_item_id, universe_id, prompt_config_json, module_overrides_json
             ) VALUES (?1, ?2, '', ?3, 0, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            new_chat_id,
            title,
            now,
            source.0,
            source.1,
            source.2,
            source.3,
            source.4,
            source.5,
            source.6,
        ],
    )?;

    transaction.execute(
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
                "SELECT id, role, content, created_at, updated_at, edited, remembered, active_variant_index
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
                    row.get::<_, i64>(5)? != 0,
                    row.get::<_, i64>(6)? != 0,
                    row.get::<_, i64>(7)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(statement);

        for (
            index,
            (
                source_message_id,
                role,
                content,
                created_at,
                updated_at,
                edited,
                remembered,
                active_variant_index,
            ),
        ) in rows.iter().enumerate()
        {
            let new_message_id = format!("{new_chat_id}-message-{index}");
            transaction.execute(
                "INSERT INTO messages (
                        id, chat_id, role, content, created_at, updated_at, edited,
                        remembered, active_variant_index
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    new_message_id,
                    new_chat_id,
                    role,
                    content,
                    created_at,
                    updated_at,
                    edited,
                    remembered,
                    active_variant_index,
                ],
            )?;

            if role == "assistant" {
                let mut variant_statement = transaction.prepare(
                    "SELECT position, content, created_at, edited
                         FROM message_variants WHERE message_id = ?1 ORDER BY position ASC",
                )?;
                let variants = variant_statement
                    .query_map(params![source_message_id], |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, i64>(2)?,
                            row.get::<_, i64>(3)? != 0,
                        ))
                    })?
                    .collect::<Result<Vec<_>, _>>()?;
                drop(variant_statement);

                for (position, variant_content, variant_created_at, variant_edited) in variants {
                    transaction.execute(
                        "INSERT INTO message_variants (
                                id, message_id, position, content, created_at, edited
                             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                        params![
                            format!("{new_message_id}-variant-{position}"),
                            new_message_id,
                            position,
                            variant_content,
                            variant_created_at,
                            variant_edited,
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
        append_message_variant(connection, message_id, variant_id, content, true)?;
        return Ok(());
    }

    let changed = connection.execute(
        "UPDATE messages SET content = ?1, updated_at = ?2, edited = 1 WHERE id = ?3",
        params![content.trim(), now_unix(), message_id],
    )?;
    if changed == 0 {
        return Err(CommandError::new(keys::MESSAGE_NOT_FOUND));
    }
    refresh_chat_summary(connection, &chat_id)?;
    invalidate_chat_ai_context(connection, &chat_id)
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
    connection.execute("DELETE FROM messages WHERE id = ?1", params![message_id])?;
    refresh_chat_summary(connection, &chat_id)?;
    invalidate_chat_ai_context(connection, &chat_id)
}

pub fn delete_messages(connection: &Connection, message_ids: &[String]) -> CommandResult<()> {
    if message_ids.is_empty() {
        return Ok(());
    }

    let transaction = connection.unchecked_transaction()?;
    let mut chat_ids = HashSet::new();

    for message_id in message_ids {
        let chat_id = transaction
            .query_row(
                "SELECT chat_id FROM messages WHERE id = ?1",
                params![message_id],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
        transaction.execute("DELETE FROM messages WHERE id = ?1", params![message_id])?;
        chat_ids.insert(chat_id);
    }

    for chat_id in chat_ids {
        refresh_chat_summary(&transaction, &chat_id)?;
        clear_chat_ai_context(&transaction, &chat_id)?;
    }

    transaction.commit()?;
    Ok(())
}

pub fn set_message_remembered(
    connection: &Connection,
    message_id: &str,
    remembered: bool,
) -> CommandResult<()> {
    let chat_id = connection
        .query_row(
            "SELECT chat_id FROM messages WHERE id = ?1",
            params![message_id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    connection.execute(
        "UPDATE messages SET remembered = ?1, updated_at = ?2 WHERE id = ?3",
        params![remembered as i64, now_unix(), message_id],
    )?;
    invalidate_chat_ai_context(connection, &chat_id)
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
    connection.execute(
        "UPDATE chats SET preview = ?1, message_count = ?2, updated_at = ?3 WHERE id = ?4",
        params![preview, message_count, updated_at, chat_id],
    )?;
    Ok(())
}

pub fn provider_optional(connection: &Connection, id: &str) -> CommandResult<Option<Provider>> {
    connection
        .query_row(
            "SELECT id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens, embedding_model, embedding_base_url
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
                    embedding_model: row.get(11)?,
                    embedding_base_url: row.get(12)?,
                    has_secret: false,
                })
            },
        )
        .optional()
        .map_err(CommandError::internal)
}

pub fn get_provider(connection: &Connection, id: &str) -> CommandResult<Provider> {
    provider_optional(connection, id)?.ok_or_else(|| CommandError::new(keys::PROVIDER_NOT_FOUND))
}

pub fn chat_module_overrides(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<ChatModuleOverrides> {
    let raw: String = connection
        .query_row(
            "SELECT module_overrides_json FROM chats WHERE id = ?1",
            params![chat_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?;
    Ok(parse_module_overrides(&raw))
}

pub fn chat_recent_message_limit(connection: &Connection, chat_id: &str) -> CommandResult<usize> {
    let (raw_prompt_config, legacy_preset): (String, String) = connection
        .query_row(
            "SELECT prompt_config_json, response_preset FROM chats WHERE id = ?1",
            params![chat_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::CHAT_NOT_FOUND))?;
    Ok(parse_prompt_config(&raw_prompt_config, &legacy_preset).recent_message_limit)
}

pub fn get_chat_prompt_context(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<ChatPromptContext> {
    let (persona_id, character_id, style_item_id, universe_id, raw_prompt_config, legacy_preset): (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        String,
    ) = connection
        .query_row(
            "SELECT persona_id, character_id, style_item_id, universe_id, prompt_config_json, response_preset
             FROM chats WHERE id = ?1",
            params![chat_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
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
    let character_style_id = character
        .as_ref()
        .filter(|item| item.data.get("stylePreset").and_then(Value::as_str) == Some("custom"))
        .and_then(|item| item.data.get("styleItemId"))
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty());
    let effective_style_id = style_item_id.as_deref().or(character_style_id);
    let character_style = effective_style_id
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

pub fn save_provider(connection: &Connection, provider: &Provider) -> CommandResult<()> {
    connection.execute(
        r#"INSERT INTO providers (
                    id, name, kind, model, status, base_url, account_id, latency_ms,
                    temperature, top_p, max_tokens, embedding_model, embedding_base_url,
                    created_at, updated_at
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)
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
                    embedding_model = excluded.embedding_model,
                    embedding_base_url = excluded.embedding_base_url,
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
            provider.embedding_model,
            provider.embedding_base_url,
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
    connection.execute(
        "UPDATE providers SET status = ?1, latency_ms = ?2, updated_at = ?3 WHERE id = ?4",
        params![status, latency_ms, now_unix(), id],
    )?;
    Ok(())
}

pub fn delete_provider(connection: &Connection, id: &str) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    transaction.execute(
        "UPDATE chats SET provider_id = NULL WHERE provider_id = ?1",
        params![id],
    )?;
    transaction.execute("DELETE FROM providers WHERE id = ?1", params![id])?;
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
    connection.execute(
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

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[cfg(test)]
mod tests;
