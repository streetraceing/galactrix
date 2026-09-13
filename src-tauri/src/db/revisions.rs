use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{EntityRestoreResult, EntityRevision, VariantFeedback};

use super::{clear_chat_ai_context, get_galaxy_item, now_unix, refresh_chat_summary};

pub(crate) const MAX_REVISIONS_PER_ENTITY: i64 = 20;
pub(crate) const MAX_LISTED_REVISIONS: i64 = 50;

pub const KIND_GALAXY: &str = "galaxy";
pub const KIND_MESSAGE: &str = "message";

/// Snapshots the current state of an entity right before it is overwritten.
/// Callers must skip the call when nothing actually changed.
pub(crate) fn record_revision(
    connection: &Connection,
    kind: &str,
    entity_id: &str,
    origin: &str,
    payload: &Value,
) -> CommandResult<()> {
    connection.execute(
        "INSERT INTO entity_revisions (id, kind, entity_id, origin, content_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            uuid::Uuid::new_v4().to_string(),
            kind,
            entity_id,
            origin,
            serde_json::to_string(payload)?,
            now_unix(),
        ],
    )?;
    // Bounded history: keep only the newest revisions per entity.
    connection.execute(
        "DELETE FROM entity_revisions
         WHERE kind = ?1 AND entity_id = ?2
           AND id NOT IN (
             SELECT id FROM entity_revisions
             WHERE kind = ?1 AND entity_id = ?2
             ORDER BY created_at DESC, rowid DESC
             LIMIT ?3
           )",
        params![kind, entity_id, MAX_REVISIONS_PER_ENTITY],
    )?;
    Ok(())
}

pub fn list_entity_revisions(
    connection: &Connection,
    kind: &str,
    entity_id: &str,
) -> CommandResult<Vec<EntityRevision>> {
    let mut statement = connection.prepare(
        "SELECT id, kind, entity_id, origin, content_json, created_at
         FROM entity_revisions
         WHERE kind = ?1 AND entity_id = ?2
         ORDER BY created_at DESC, rowid DESC
         LIMIT ?3",
    )?;
    let rows = statement
        .query_map(params![kind, entity_id, MAX_LISTED_REVISIONS], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows
        .into_iter()
        .map(
            |(id, kind, entity_id, origin, content_json, created_at)| EntityRevision {
                payload: serde_json::from_str(&content_json).unwrap_or(Value::Null),
                id,
                kind,
                entity_id,
                origin,
                created_at,
            },
        )
        .collect())
}

/// Restores an entity from a revision. The state being replaced is recorded
/// first with the `restore` origin, so a restore is itself undoable.
pub fn restore_entity_revision(
    connection: &Connection,
    kind: &str,
    entity_id: &str,
    revision_id: &str,
) -> CommandResult<EntityRestoreResult> {
    let (content_json,): (String,) = connection
        .query_row(
            "SELECT content_json FROM entity_revisions
             WHERE id = ?1 AND kind = ?2 AND entity_id = ?3",
            params![revision_id, kind, entity_id],
            |row| Ok((row.get::<_, String>(0)?,)),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::REVISION_NOT_FOUND))?;
    let payload: Value = serde_json::from_str(&content_json)
        .map_err(|_| CommandError::new(keys::REVISION_NOT_FOUND))?;

    match kind {
        KIND_GALAXY => restore_galaxy(connection, entity_id, payload),
        KIND_MESSAGE => restore_message(connection, entity_id, payload)
            .map(|_| EntityRestoreResult { item: None }),
        _ => Err(CommandError::new(keys::REVISION_KIND_UNKNOWN)),
    }
}

fn restore_galaxy(
    connection: &Connection,
    entity_id: &str,
    payload: Value,
) -> CommandResult<EntityRestoreResult> {
    // The snapshot must be complete before it may replace the live item.
    let name = payload
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::new(keys::REVISION_NOT_FOUND))?;
    let description = payload
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let data = payload
        .get("data")
        .cloned()
        .unwrap_or_else(|| Value::Object(serde_json::Map::new()));
    if !data.is_object() {
        return Err(CommandError::new(keys::REVISION_NOT_FOUND));
    }

    let current = get_galaxy_item(connection, entity_id)?;
    let data_json = serde_json::to_string(&data)?;
    if data_json.len() > 1_000_000 {
        return Err(CommandError::new(keys::GALAXY_DATA_TOO_LARGE));
    }
    let now = now_unix();
    let transaction = connection.unchecked_transaction()?;
    record_revision(
        &transaction,
        KIND_GALAXY,
        entity_id,
        "restore",
        &serde_json::json!({
            "name": current.name,
            "description": current.description,
            "data": current.data,
        }),
    )?;
    transaction.execute(
        "UPDATE galaxy_items
         SET name = ?1, description = ?2, data_json = ?3, updated_at = ?4
         WHERE id = ?5",
        params![name, description.trim(), data_json, now, entity_id],
    )?;
    transaction.commit().map_err(CommandError::internal)?;

    let item = get_galaxy_item(connection, entity_id)?;
    Ok(EntityRestoreResult { item: Some(item) })
}

fn restore_message(connection: &Connection, entity_id: &str, payload: Value) -> CommandResult<()> {
    let content = payload
        .get("content")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::new(keys::REVISION_NOT_FOUND))?;

    ensure_message_editable(connection, entity_id)?;
    let (chat_id, role, previous): (String, String, String) = connection
        .query_row(
            "SELECT chat_id, role, content FROM messages WHERE id = ?1",
            params![entity_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::MESSAGE_NOT_FOUND))?;
    // Assistant history already lives in variants; direct restore would fight it.
    if role == "assistant" {
        return Err(CommandError::new(keys::MESSAGE_VARIANTS_ASSISTANT_ONLY));
    }
    if previous.trim() == content {
        return Ok(());
    }

    let transaction = connection.unchecked_transaction()?;
    record_revision(
        &transaction,
        KIND_MESSAGE,
        entity_id,
        "restore",
        &serde_json::json!({ "content": previous }),
    )?;
    transaction.execute(
        "UPDATE messages SET content = ?1, updated_at = ?2, edited = 1 WHERE id = ?3",
        params![content, now_unix(), entity_id],
    )?;
    refresh_chat_summary(&transaction, &chat_id)?;
    clear_chat_ai_context(&transaction, &chat_id)?;
    transaction.commit().map_err(CommandError::internal)
}

fn ensure_message_editable(connection: &Connection, message_id: &str) -> CommandResult<()> {
    let archived: Option<i64> = connection
        .query_row(
            "SELECT c.archived FROM messages m
             INNER JOIN chats c ON c.id = m.chat_id
             WHERE m.id = ?1",
            params![message_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;
    if archived == Some(1) {
        return Err(CommandError::new(keys::CHAT_ARCHIVED_READ_ONLY));
    }
    Ok(())
}

/// Removes revisions whose entity no longer exists. Runs once per launch so
/// deleted items and messages cannot accumulate orphaned history.
pub(crate) fn prune_orphan_revisions(connection: &Connection) -> CommandResult<()> {
    connection.execute_batch(
        r#"
            DELETE FROM entity_revisions
            WHERE kind = 'message'
              AND entity_id NOT IN (SELECT id FROM messages);

            DELETE FROM entity_revisions
            WHERE kind = 'galaxy'
              AND entity_id NOT IN (SELECT id FROM galaxy_items);
        "#,
    )?;
    Ok(())
}

const MAX_FEEDBACK_CONTENT_CHARS: usize = 1_200;
const MAX_FEEDBACK_ITEMS: i64 = 20;

/// Highly rated or annotated response variants from chats that use the given
/// entity (character, style or prompt set), newest and best first. Prompts
/// and worldbooks get no hints: they are not generation personas.
pub fn list_variant_feedback(
    connection: &Connection,
    entity_id: &str,
) -> CommandResult<Vec<VariantFeedback>> {
    let kind: String = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![entity_id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::GALAXY_NOT_FOUND))?;
    if !matches!(kind.as_str(), "character" | "style" | "prompt-set") {
        return Ok(Vec::new());
    }

    // Prompt sets are referenced inside chat prompt_config_json; a parameter
    // binding with the raw id is safe here because ids are generated UUIDs.
    let mut statement = connection.prepare(
        "SELECT c.title, v.rating, v.note, v.content, v.created_at
         FROM message_variants v
         INNER JOIN messages m ON m.id = v.message_id
         INNER JOIN chats c ON c.id = m.chat_id
         WHERE m.role = 'assistant'
           AND (v.rating >= 4 OR (v.note IS NOT NULL AND TRIM(v.note) <> ''))
           AND (
             c.character_id = ?1
             OR c.style_item_id = ?1
             OR c.prompt_config_json LIKE '%' || ?1 || '%'
           )
         ORDER BY v.rating IS NULL, v.rating DESC, v.created_at DESC
         LIMIT ?2",
    )?;
    let rows = statement
        .query_map(params![entity_id, MAX_FEEDBACK_ITEMS], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows
        .into_iter()
        .map(
            |(chat_title, rating, note, content, created_at)| VariantFeedback {
                content: content.chars().take(MAX_FEEDBACK_CONTENT_CHARS).collect(),
                chat_title,
                rating,
                note,
                created_at,
            },
        )
        .collect())
}
