use std::path::Path;

use rusqlite::{params, Connection};

use crate::i18n::CommandResult;
use crate::models::{
    DatabaseHealthReport, HealthIssue, HealthRepairAction, HealthRepairReport, HealthTableCount,
};

use super::now_unix;

const MAX_SAMPLES: usize = 5;
const MAX_INTEGRITY_MESSAGES: usize = 10;

const SEVERITY_ERROR: &str = "error";
const SEVERITY_WARNING: &str = "warning";
const SEVERITY_INFO: &str = "info";

/// Message-kind semantic memories reference chat messages by id; the other
/// kinds are keyed by stable derived ids and cannot dangle.
const MESSAGE_BACKED_MEMORY_KINDS: &[&str] = &["remembered-message", "archived-message"];

pub(crate) fn build_health_report(
    connection: &Connection,
    database_path: &Path,
    app_version: &str,
) -> CommandResult<DatabaseHealthReport> {
    let integrity_messages = integrity_check_messages(connection)?;
    let foreign_keys = foreign_key_violations(connection)?;
    let issues = collect_issues(connection, &foreign_keys)?;

    Ok(DatabaseHealthReport {
        created_at: now_unix(),
        app_version: app_version.to_owned(),
        database_size_bytes: file_size(database_path),
        wal_size_bytes: sidecar_size(database_path, "-wal"),
        integrity_ok: integrity_messages.is_empty(),
        integrity_messages,
        foreign_key_violations: foreign_keys.len(),
        tables: table_counts(connection)?,
        issues,
    })
}

pub(crate) fn repair_health_issues(
    connection: &Connection,
    database_path: &Path,
    app_version: &str,
) -> CommandResult<HealthRepairReport> {
    let transaction = connection.unchecked_transaction()?;
    let mut actions: Vec<HealthRepairAction> = Vec::new();

    let mut push_action = |issue_id: &str, affected: i64| {
        if affected > 0 {
            actions.push(HealthRepairAction {
                issue_id: issue_id.to_owned(),
                affected,
            });
        }
    };

    let violations = foreign_key_violations(&transaction)?;
    if !violations.is_empty() {
        let mut removed = 0usize;
        for violation in &violations {
            removed += transaction.execute(
                &format!("DELETE FROM {} WHERE rowid = ?1", violation.child_table),
                params![violation.row_id],
            )?;
        }
        push_action("foreignKeyViolation", removed as i64);
    }

    let repaired_providers = transaction.execute(
        "UPDATE chats SET provider_id = NULL
         WHERE provider_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM providers WHERE id = chats.provider_id)",
        [],
    )?;
    push_action("chatProviderReference", repaired_providers as i64);

    for (column, kind, issue_id) in [
        ("persona_id", "persona", "chatPersonaReference"),
        ("character_id", "character", "chatCharacterReference"),
        ("style_item_id", "style", "chatStyleReference"),
        ("universe_id", "universe", "chatUniverseReference"),
    ] {
        let repaired = transaction.execute(
            &format!(
                "UPDATE chats SET {column} = NULL
                 WHERE {column} IS NOT NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM galaxy_items
                     WHERE id = chats.{column} AND kind = '{kind}'
                   )"
            ),
            [],
        )?;
        push_action(issue_id, repaired as i64);
    }

    let repaired_worldbooks = transaction.execute(
        "DELETE FROM chat_worldbooks
         WHERE NOT EXISTS (
           SELECT 1 FROM galaxy_items
           WHERE id = chat_worldbooks.worldbook_id AND kind = 'worldbook'
         )",
        [],
    )?;
    push_action("chatWorldbookReference", repaired_worldbooks as i64);

    let missing_variants = transaction.execute(
        "INSERT INTO message_variants (id, message_id, position, content, created_at, edited)
         SELECT messages.id || '-variant-0', messages.id, 0, messages.content,
                messages.created_at, messages.edited
         FROM messages
         WHERE role = 'assistant'
           AND NOT EXISTS (
             SELECT 1 FROM message_variants WHERE message_id = messages.id
           )",
        [],
    )?;
    push_action("assistantVariantMissing", missing_variants as i64);

    let stray_messages = scalar_count(
        &transaction,
        "SELECT COUNT(*) FROM messages
         WHERE role <> 'assistant'
           AND EXISTS (SELECT 1 FROM message_variants WHERE message_id = messages.id)",
    )?;
    if stray_messages > 0 {
        transaction.execute(
            "DELETE FROM message_variants
             WHERE message_id IN (SELECT id FROM messages WHERE role <> 'assistant')",
            [],
        )?;
        transaction.execute(
            "UPDATE messages SET active_variant_index = 0
             WHERE role <> 'assistant' AND active_variant_index <> 0",
            [],
        )?;
        push_action("strayMessageVariants", stray_messages);
    }

    let repaired_indices = transaction.execute(
        "UPDATE messages SET active_variant_index = (
             SELECT MAX(position) FROM message_variants WHERE message_id = messages.id
         )
         WHERE role = 'assistant'
           AND EXISTS (SELECT 1 FROM message_variants WHERE message_id = messages.id)
           AND active_variant_index NOT IN (
             SELECT position FROM message_variants WHERE message_id = messages.id
           )",
        [],
    )?;
    push_action("activeVariantOutOfRange", repaired_indices as i64);

    let mismatched_chats = string_column(
        &transaction,
        "SELECT DISTINCT chat_id FROM messages
         WHERE role = 'assistant'
           AND content <> (
             SELECT v.content FROM message_variants v
             WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
           )",
    )?;
    if !mismatched_chats.is_empty() {
        let mismatched_messages = scalar_count(
            &transaction,
            "SELECT COUNT(*) FROM messages
             WHERE role = 'assistant'
               AND content <> (
                 SELECT v.content FROM message_variants v
                 WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
               )",
        )?;
        transaction.execute(
            "UPDATE messages SET content = (
                 SELECT v.content FROM message_variants v
                 WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
             ),
             edited = COALESCE((
                 SELECT v.edited FROM message_variants v
                 WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
             ), messages.edited)
             WHERE role = 'assistant'
               AND content <> (
                 SELECT v.content FROM message_variants v
                 WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
               )",
            [],
        )?;
        push_action("activeVariantContentMismatch", mismatched_messages);
        // Derived AI context may reference the replaced content.
        for chat_id in &mismatched_chats {
            transaction.execute(
                "DELETE FROM chat_contexts WHERE chat_id = ?1",
                params![chat_id],
            )?;
        }
    }

    let count_drift = scalar_count(
        &transaction,
        "SELECT COUNT(*) FROM chats
         WHERE message_count <> (
           SELECT COUNT(*) FROM messages WHERE chat_id = chats.id
         )",
    )?;
    let preview_drift = scalar_count(
        &transaction,
        "SELECT COUNT(*) FROM chats
         WHERE preview <> COALESCE((
           SELECT content FROM messages WHERE chat_id = chats.id
           ORDER BY created_at DESC, rowid DESC LIMIT 1
         ), '')",
    )?;
    if count_drift > 0 || preview_drift > 0 {
        transaction.execute(
            "UPDATE chats
             SET message_count = (SELECT COUNT(*) FROM messages WHERE chat_id = chats.id),
                 preview = COALESCE((
                   SELECT content FROM messages WHERE chat_id = chats.id
                   ORDER BY created_at DESC, rowid DESC LIMIT 1
                 ), '')
             WHERE message_count <> (SELECT COUNT(*) FROM messages WHERE chat_id = chats.id)
                OR preview <> COALESCE((
                   SELECT content FROM messages WHERE chat_id = chats.id
                   ORDER BY created_at DESC, rowid DESC LIMIT 1
                 ), '')",
            [],
        )?;
        push_action("chatMessageCountDrift", count_drift);
        push_action("chatPreviewDrift", preview_drift);
    }

    let repaired_cursors = transaction.execute(
        "UPDATE chat_contexts SET covered_through_message_id = NULL
         WHERE covered_through_message_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM messages
             WHERE id = chat_contexts.covered_through_message_id
               AND chat_id = chat_contexts.chat_id
           )",
        [],
    )?;
    push_action("contextCursorDangling", repaired_cursors as i64);

    let repaired_memories = transaction.execute(
        &format!(
            "DELETE FROM semantic_memories
             WHERE source_kind IN ({})
               AND NOT EXISTS (
                 SELECT 1 FROM messages
                 WHERE id = semantic_memories.source_id
                   AND chat_id = semantic_memories.chat_id
               )",
            MESSAGE_BACKED_MEMORY_KINDS
                .iter()
                .map(|kind| format!("'{kind}'"))
                .collect::<Vec<_>>()
                .join(", "),
        ),
        [],
    )?;
    push_action("semanticMemoryDanglingSource", repaired_memories as i64);

    transaction.commit()?;

    let report = build_health_report(connection, database_path, app_version)?;
    Ok(HealthRepairReport {
        repaired_at: now_unix(),
        actions,
        report,
    })
}

fn collect_issues(
    connection: &Connection,
    foreign_keys: &[ForeignKeyViolation],
) -> CommandResult<Vec<HealthIssue>> {
    let mut issues = Vec::new();

    if !foreign_keys.is_empty() {
        issues.push(HealthIssue {
            id: "foreignKeyViolation".into(),
            severity: SEVERITY_ERROR.into(),
            affected: foreign_keys.len() as i64,
            repairable: true,
            samples: foreign_keys
                .iter()
                .take(MAX_SAMPLES)
                .map(|violation| format!("{}#{}", violation.child_table, violation.row_id))
                .collect(),
        });
    }

    let chat_provider_ids = string_column(
        connection,
        "SELECT id FROM chats
         WHERE provider_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM providers WHERE id = chats.provider_id)",
    )?;
    issues.push(chat_reference_issue(
        "chatProviderReference",
        SEVERITY_WARNING,
        &chat_provider_ids,
    ));

    for (column, kind, issue_id) in [
        ("persona_id", "persona", "chatPersonaReference"),
        ("character_id", "character", "chatCharacterReference"),
        ("style_item_id", "style", "chatStyleReference"),
        ("universe_id", "universe", "chatUniverseReference"),
    ] {
        let chat_ids = string_column(
            connection,
            &format!(
                "SELECT id FROM chats
                 WHERE {column} IS NOT NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM galaxy_items
                     WHERE id = chats.{column} AND kind = '{kind}'
                   )"
            ),
        )?;
        issues.push(chat_reference_issue(issue_id, SEVERITY_WARNING, &chat_ids));
    }

    let worldbook_rows = scalar_count(
        connection,
        "SELECT COUNT(*) FROM chat_worldbooks
         WHERE NOT EXISTS (
           SELECT 1 FROM galaxy_items
           WHERE id = chat_worldbooks.worldbook_id AND kind = 'worldbook'
         )",
    )?;
    if worldbook_rows > 0 {
        issues.push(HealthIssue {
            id: "chatWorldbookReference".into(),
            severity: SEVERITY_WARNING.into(),
            affected: worldbook_rows,
            repairable: true,
            samples: string_column(
                connection,
                "SELECT chat_id || ':' || worldbook_id FROM chat_worldbooks
                 WHERE NOT EXISTS (
                   SELECT 1 FROM galaxy_items
                   WHERE id = chat_worldbooks.worldbook_id AND kind = 'worldbook'
                 )",
            )?
            .into_iter()
            .take(MAX_SAMPLES)
            .collect(),
        });
    }

    let count_drift_ids = string_column(
        connection,
        "SELECT id FROM chats
         WHERE message_count <> (SELECT COUNT(*) FROM messages WHERE chat_id = chats.id)",
    )?;
    issues.push(chat_reference_issue(
        "chatMessageCountDrift",
        SEVERITY_INFO,
        &count_drift_ids,
    ));

    let preview_drift_ids = string_column(
        connection,
        "SELECT id FROM chats
         WHERE preview <> COALESCE((
           SELECT content FROM messages WHERE chat_id = chats.id
           ORDER BY created_at DESC, rowid DESC LIMIT 1
         ), '')",
    )?;
    issues.push(chat_reference_issue(
        "chatPreviewDrift",
        SEVERITY_INFO,
        &preview_drift_ids,
    ));

    let missing_variant_ids = string_column(
        connection,
        "SELECT id FROM messages
         WHERE role = 'assistant'
           AND NOT EXISTS (SELECT 1 FROM message_variants WHERE message_id = messages.id)",
    )?;
    issues.push(message_issue(
        "assistantVariantMissing",
        SEVERITY_ERROR,
        &missing_variant_ids,
    ));

    let stray_variant_ids = string_column(
        connection,
        "SELECT id FROM messages
         WHERE role <> 'assistant'
           AND EXISTS (SELECT 1 FROM message_variants WHERE message_id = messages.id)",
    )?;
    issues.push(message_issue(
        "strayMessageVariants",
        SEVERITY_WARNING,
        &stray_variant_ids,
    ));

    let out_of_range_ids = string_column(
        connection,
        "SELECT id FROM messages
         WHERE role = 'assistant'
           AND EXISTS (SELECT 1 FROM message_variants WHERE message_id = messages.id)
           AND active_variant_index NOT IN (
             SELECT position FROM message_variants WHERE message_id = messages.id
           )",
    )?;
    issues.push(message_issue(
        "activeVariantOutOfRange",
        SEVERITY_WARNING,
        &out_of_range_ids,
    ));

    let mismatched_ids = string_column(
        connection,
        "SELECT id FROM messages
         WHERE role = 'assistant'
           AND content <> (
             SELECT v.content FROM message_variants v
             WHERE v.message_id = messages.id AND v.position = messages.active_variant_index
           )",
    )?;
    issues.push(message_issue(
        "activeVariantContentMismatch",
        SEVERITY_WARNING,
        &mismatched_ids,
    ));

    let dangling_cursor_ids = string_column(
        connection,
        "SELECT chat_id FROM chat_contexts
         WHERE covered_through_message_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM messages
             WHERE id = chat_contexts.covered_through_message_id
               AND chat_id = chat_contexts.chat_id
           )",
    )?;
    issues.push(chat_reference_issue(
        "contextCursorDangling",
        SEVERITY_WARNING,
        &dangling_cursor_ids,
    ));

    let memory_kinds = MESSAGE_BACKED_MEMORY_KINDS
        .iter()
        .map(|kind| format!("'{kind}'"))
        .collect::<Vec<_>>()
        .join(", ");
    let dangling_memory_ids = string_column(
        connection,
        &format!(
            "SELECT id FROM semantic_memories
             WHERE source_kind IN ({memory_kinds})
               AND NOT EXISTS (
                 SELECT 1 FROM messages
                 WHERE id = semantic_memories.source_id
                   AND chat_id = semantic_memories.chat_id
               )"
        ),
    )?;
    issues.push(chat_reference_issue(
        "semanticMemoryDanglingSource",
        SEVERITY_INFO,
        &dangling_memory_ids,
    ));

    issues.retain(|issue| issue.affected > 0);
    Ok(issues)
}

fn chat_reference_issue(issue_id: &str, severity: &str, chat_ids: &[String]) -> HealthIssue {
    HealthIssue {
        id: issue_id.into(),
        severity: severity.into(),
        affected: chat_ids.len() as i64,
        repairable: true,
        samples: chat_ids.iter().take(MAX_SAMPLES).cloned().collect(),
    }
}

fn message_issue(issue_id: &str, severity: &str, message_ids: &[String]) -> HealthIssue {
    HealthIssue {
        id: issue_id.into(),
        severity: severity.into(),
        affected: message_ids.len() as i64,
        repairable: true,
        samples: message_ids.iter().take(MAX_SAMPLES).cloned().collect(),
    }
}

fn integrity_check_messages(connection: &Connection) -> CommandResult<Vec<String>> {
    let mut statement = connection.prepare("PRAGMA integrity_check")?;
    let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
    let mut messages = Vec::new();
    for row in rows {
        let message = row?;
        if message == "ok" {
            continue;
        }
        messages.push(message);
        if messages.len() >= MAX_INTEGRITY_MESSAGES {
            break;
        }
    }
    Ok(messages)
}

struct ForeignKeyViolation {
    child_table: String,
    row_id: i64,
}

fn foreign_key_violations(connection: &Connection) -> CommandResult<Vec<ForeignKeyViolation>> {
    let mut statement = connection.prepare("PRAGMA foreign_key_check")?;
    let rows = statement.query_map([], |row| {
        Ok(ForeignKeyViolation {
            child_table: row.get::<_, String>(0)?,
            row_id: row.get::<_, i64>(1)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn table_counts(connection: &Connection) -> CommandResult<Vec<HealthTableCount>> {
    let tables = [
        "chats",
        "messages",
        "message_variants",
        "galaxy_items",
        "providers",
        "chat_worldbooks",
        "chat_contexts",
        "semantic_memories",
        "usage_events",
    ];
    let mut counts = Vec::with_capacity(tables.len());
    for table in tables {
        counts.push(HealthTableCount {
            name: table.to_owned(),
            rows: connection.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                row.get::<_, i64>(0)
            })?,
        });
    }
    Ok(counts)
}

fn scalar_count(connection: &Connection, sql: &str) -> CommandResult<i64> {
    Ok(connection.query_row(sql, [], |row| row.get::<_, i64>(0))?)
}

fn string_column(connection: &Connection, sql: &str) -> CommandResult<Vec<String>> {
    let mut statement = connection.prepare(sql)?;
    let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn file_size(path: &Path) -> i64 {
    std::fs::metadata(path).map_or(0, |metadata| metadata.len() as i64)
}

fn sidecar_size(path: &Path, suffix: &str) -> i64 {
    let mut sidecar = path.as_os_str().to_os_string();
    sidecar.push(suffix);
    file_size(Path::new(&sidecar))
}

#[cfg(test)]
#[path = "../../../test/rust/health.rs"]
mod tests;
