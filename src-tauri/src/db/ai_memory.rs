use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection, OptionalExtension};

use crate::i18n::{CommandError, CommandResult};
use crate::models::{DynamicContextState, SemanticMemoryCandidate, SemanticMemoryRecord};

use super::now_unix;

pub(crate) fn get_dynamic_context(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<Option<DynamicContextState>> {
    connection
        .query_row(
            "SELECT context_json, covered_through_message_id, updated_at
             FROM chat_contexts WHERE chat_id = ?1",
            params![chat_id],
            |row| {
                let raw: String = row.get(0)?;
                let mut state =
                    serde_json::from_str::<DynamicContextState>(&raw).unwrap_or_default();
                state.covered_through_message_id = row.get(1)?;
                state.updated_at = row.get(2)?;
                Ok(state)
            },
        )
        .optional()
        .map_err(CommandError::internal)
}

pub(crate) fn save_dynamic_context(
    connection: &Connection,
    chat_id: &str,
    state: &DynamicContextState,
) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    let now = now_unix();
    let mut stored = state.clone();
    stored.updated_at = now;
    let context_json = serde_json::to_string(&stored)?;
    let covered_through_message_id = stored.covered_through_message_id.clone();
    transaction.execute(
        "INSERT INTO chat_contexts (
            chat_id, context_json, covered_through_message_id, updated_at
         ) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(chat_id) DO UPDATE SET
            context_json = excluded.context_json,
            covered_through_message_id = excluded.covered_through_message_id,
            updated_at = excluded.updated_at",
        params![chat_id, context_json, covered_through_message_id, now],
    )?;
    transaction.execute(
        "DELETE FROM semantic_memories
         WHERE chat_id = ?1 AND source_kind LIKE 'context-%'",
        params![chat_id],
    )?;
    transaction.commit().map_err(CommandError::internal)
}

pub(super) fn clear_chat_ai_context(connection: &Connection, chat_id: &str) -> CommandResult<()> {
    connection.execute(
        "DELETE FROM chat_contexts WHERE chat_id = ?1",
        params![chat_id],
    )?;
    connection.execute(
        "DELETE FROM semantic_memories WHERE chat_id = ?1",
        params![chat_id],
    )?;
    Ok(())
}

pub(crate) fn invalidate_chat_ai_context(
    connection: &Connection,
    chat_id: &str,
) -> CommandResult<()> {
    let transaction = connection.unchecked_transaction()?;
    clear_chat_ai_context(&transaction, chat_id)?;
    transaction.commit().map_err(CommandError::internal)
}

pub(crate) fn semantic_memory_indexed_contents(
    connection: &Connection,
    chat_id: &str,
    provider_id: &str,
    model: &str,
) -> CommandResult<HashMap<(String, String), String>> {
    let mut statement = connection.prepare(
        "SELECT source_kind, source_id, content
         FROM semantic_memories
         WHERE chat_id = ?1 AND embedding_provider_id = ?2 AND embedding_model = ?3",
    )?;
    let rows = statement
        .query_map(params![chat_id, provider_id, model], |row| {
            Ok((
                (row.get::<_, String>(0)?, row.get::<_, String>(1)?),
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?;
    Ok(rows)
}

pub(crate) fn prune_semantic_memories(
    connection: &Connection,
    chat_id: &str,
    provider_id: &str,
    model: &str,
    candidates: &[SemanticMemoryCandidate],
) -> CommandResult<()> {
    connection.execute(
        "DELETE FROM semantic_memories
         WHERE chat_id = ?1 AND (embedding_provider_id != ?2 OR embedding_model != ?3)",
        params![chat_id, provider_id, model],
    )?;
    let keep = candidates
        .iter()
        .map(|candidate| (candidate.source_kind.as_str(), candidate.source_id.as_str()))
        .collect::<HashSet<_>>();
    let mut statement = connection.prepare(
        "SELECT source_kind, source_id FROM semantic_memories
         WHERE chat_id = ?1 AND embedding_provider_id = ?2 AND embedding_model = ?3",
    )?;
    let existing = statement
        .query_map(params![chat_id, provider_id, model], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    let stale = existing
        .into_iter()
        .filter(|(kind, id)| !keep.contains(&(kind.as_str(), id.as_str())))
        .collect::<Vec<_>>();
    if stale.is_empty() {
        return Ok(());
    }

    let transaction = connection.unchecked_transaction()?;
    for (kind, id) in stale {
        transaction.execute(
            "DELETE FROM semantic_memories
             WHERE chat_id = ?1 AND source_kind = ?2 AND source_id = ?3",
            params![chat_id, kind, id],
        )?;
    }
    transaction.commit().map_err(CommandError::internal)
}

pub(crate) fn upsert_semantic_memories(
    connection: &Connection,
    chat_id: &str,
    provider_id: &str,
    model: &str,
    entries: &[(SemanticMemoryCandidate, Vec<f32>)],
) -> CommandResult<()> {
    if entries.is_empty() {
        return Ok(());
    }
    let transaction = connection.unchecked_transaction()?;
    let now = now_unix();
    for (candidate, embedding) in entries {
        if embedding.is_empty() {
            continue;
        }
        let id = format!(
            "{}:{}:{}",
            chat_id, candidate.source_kind, candidate.source_id
        );
        transaction.execute(
            "INSERT INTO semantic_memories (
                id, chat_id, source_kind, source_id, content, embedding_json,
                embedding_provider_id, embedding_model, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
             ON CONFLICT(chat_id, source_kind, source_id) DO UPDATE SET
                content = excluded.content,
                embedding_json = excluded.embedding_json,
                embedding_provider_id = excluded.embedding_provider_id,
                embedding_model = excluded.embedding_model,
                updated_at = excluded.updated_at",
            params![
                id,
                chat_id,
                candidate.source_kind,
                candidate.source_id,
                candidate.content,
                serde_json::to_string(embedding)?,
                provider_id,
                model,
                now
            ],
        )?;
    }
    transaction.commit().map_err(CommandError::internal)
}

pub(crate) fn list_semantic_memories(
    connection: &Connection,
    chat_id: &str,
    provider_id: &str,
    model: &str,
) -> CommandResult<Vec<SemanticMemoryRecord>> {
    let mut statement = connection.prepare(
        "SELECT source_kind, source_id, content, embedding_json
         FROM semantic_memories
         WHERE chat_id = ?1 AND embedding_provider_id = ?2 AND embedding_model = ?3",
    )?;
    let records = statement
        .query_map(params![chat_id, provider_id, model], |row| {
            let raw: String = row.get(3)?;
            Ok(SemanticMemoryRecord::from_storage(
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                serde_json::from_str::<Vec<f32>>(&raw).unwrap_or_default(),
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(records)
}
