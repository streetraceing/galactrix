use super::{build_health_report, repair_health_issues};
use crate::db::{add_assistant_message, add_user_message, create_chat, upsert_galaxy_item};
use crate::models::{ChatConfigInput, GalaxyItemInput, PromptConfig};
use rusqlite::{params, Connection};
use std::path::Path;

fn test_database() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .expect("foreign keys must enable");
    crate::db::migrate(&connection).expect("schema must migrate");
    connection
}

fn chat_config(title: &str) -> ChatConfigInput {
    ChatConfigInput {
        title: title.into(),
        auto_title: false,
        automatic_title_base: None,
        greeting_message: None,
        provider_id: None,
        persona_id: None,
        character_id: None,
        style_item_id: None,
        universe_id: None,
        worldbook_ids: Vec::new(),
        tags: Vec::new(),
        prompt_config: PromptConfig::default(),
        generation_settings: Default::default(),
        module_overrides: Default::default(),
    }
}

fn create_conversation(connection: &Connection, chat_id: &str) {
    create_chat(connection, chat_id, &chat_config("Health chat")).expect("chat must be created");
    add_user_message(
        connection,
        chat_id,
        &format!("{chat_id}-user"),
        "Hello there",
    )
    .expect("user message must be created");
    add_assistant_message(
        connection,
        chat_id,
        &format!("{chat_id}-assistant"),
        "Greetings, traveler",
    )
    .expect("assistant message must be created");
}

fn issue_affected(report: &crate::models::DatabaseHealthReport, issue_id: &str) -> i64 {
    report
        .issues
        .iter()
        .find(|issue| issue.id == issue_id)
        .map(|issue| issue.affected)
        .unwrap_or(0)
}

fn repaired_action_count(report: &crate::models::HealthRepairReport, issue_id: &str) -> i64 {
    report
        .actions
        .iter()
        .find(|action| action.issue_id == issue_id)
        .map(|action| action.affected)
        .unwrap_or(0)
}

fn scalar(connection: &Connection, sql: &str) -> String {
    connection
        .query_row(sql, [], |row| row.get::<_, String>(0))
        .expect("scalar query must return a row")
}

#[test]
fn healthy_database_reports_no_issues() {
    let connection = test_database();
    create_conversation(&connection, "chat-1");
    upsert_galaxy_item(
        &connection,
        "persona-1",
        &GalaxyItemInput {
            id: Some("persona-1".into()),
            kind: "persona".into(),
            name: "Explorer".into(),
            description: String::new(),
            data: serde_json::json!({}),
        },
    )
    .expect("galaxy item must be created");
    connection
        .execute(
            "INSERT INTO providers (id, name, kind, model, status, created_at, updated_at)
             VALUES ('provider-1', 'Lab', 'openai', 'gpt-test', 'disabled', 0, 0)",
            [],
        )
        .expect("provider must be created");

    let report =
        build_health_report(&connection, Path::new("unused.sqlite3"), "1.0.0").expect("report");

    assert!(report.integrity_ok);
    assert_eq!(report.foreign_key_violations, 0);
    assert!(
        report.issues.is_empty(),
        "unexpected issues: {:?}",
        report.issues
    );
    let rows = |name: &str| {
        report
            .tables
            .iter()
            .find(|table| table.name == name)
            .map(|table| table.rows)
            .unwrap_or_default()
    };
    assert_eq!(rows("chats"), 1);
    assert_eq!(rows("messages"), 2);
    assert_eq!(rows("message_variants"), 1);
    assert_eq!(rows("providers"), 1);
    assert_eq!(rows("galaxy_items"), 1);
}

#[test]
fn report_never_contains_message_content() {
    let connection = test_database();
    create_conversation(&connection, "chat-1");

    let report =
        build_health_report(&connection, Path::new("unused.sqlite3"), "1.0.0").expect("report");
    let serialized = serde_json::to_string(&report).expect("report must serialize");

    assert!(!serialized.contains("Hello there"));
    assert!(!serialized.contains("Greetings"));
}

#[test]
fn detects_and_repairs_every_issue_kind() {
    let connection = test_database();
    create_conversation(&connection, "chat-1");
    // Second conversation to exercise out-of-range and content drift repairs.
    create_conversation(&connection, "chat-2");
    add_assistant_message(&connection, "chat-2", "chat-2-second", "Second reply")
        .expect("second assistant message must be created");

    connection
        .execute_batch(
            r#"
            UPDATE chats SET provider_id = 'missing-provider' WHERE id = 'chat-1';
            UPDATE chats SET persona_id = 'missing-persona' WHERE id = 'chat-1';
            UPDATE chats SET character_id = 'missing-character' WHERE id = 'chat-1';
            UPDATE chats SET style_item_id = 'missing-style' WHERE id = 'chat-1';
            UPDATE chats SET universe_id = 'missing-universe' WHERE id = 'chat-1';
            INSERT INTO galaxy_items (id, kind, name, description, data_json, updated_at)
                VALUES ('not-a-worldbook', 'character', 'Impostor', '', '{}', 0);
            INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
                VALUES ('chat-1', 'not-a-worldbook', 0);
            UPDATE chats SET message_count = 99, preview = 'stale preview' WHERE id = 'chat-1';
            DELETE FROM message_variants WHERE message_id = 'chat-1-assistant';
            UPDATE messages SET active_variant_index = 9 WHERE id = 'chat-2-second';
            UPDATE messages SET content = 'drifted content' WHERE id = 'chat-2-assistant';
            INSERT INTO message_variants (id, message_id, position, content, created_at, edited)
                VALUES ('stray-variant', 'chat-1-user', 0, 'stray', 0, 0);
            INSERT INTO chat_contexts (chat_id, context_json, covered_through_message_id, updated_at)
                VALUES ('chat-1', '{}', 'deleted-message', 0);
            "#,
        )
        .expect("corruptions must apply");

    connection
        .execute(
            "INSERT INTO providers (id, name, kind, model, status, created_at, updated_at)
             VALUES ('memory-provider', 'Memory', 'openai', 'embed-test', 'disabled', 0, 0)",
            [],
        )
        .expect("provider must be created");
    connection
        .execute(
            "INSERT INTO semantic_memories (
                id, chat_id, source_kind, source_id, content, embedding_json,
                embedding_provider_id, embedding_model, created_at, updated_at
             ) VALUES ('dangling-memory', 'chat-1', 'remembered-message', 'deleted-message',
                       'x', '[]', 'memory-provider', 'embed-test', 0, 0)",
            [],
        )
        .expect("semantic memory must be created");
    // A foreign-key violation cannot exist while enforcement is on; simulate
    // a database that was written with enforcement disabled.
    connection
        .pragma_update(None, "foreign_keys", "OFF")
        .expect("foreign keys must disable");
    connection
        .execute(
            "INSERT INTO messages (id, chat_id, role, content, created_at, updated_at)
             VALUES ('orphan-message', 'deleted-chat', 'user', 'orphan', 0, 0)",
            [],
        )
        .expect("orphan message must be created");
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .expect("foreign keys must enable");

    let report =
        build_health_report(&connection, Path::new("unused.sqlite3"), "1.0.0").expect("report");

    assert_eq!(report.foreign_key_violations, 1);
    assert_eq!(issue_affected(&report, "foreignKeyViolation"), 1);
    assert_eq!(issue_affected(&report, "chatProviderReference"), 1);
    for issue_id in [
        "chatPersonaReference",
        "chatCharacterReference",
        "chatStyleReference",
        "chatUniverseReference",
    ] {
        assert_eq!(issue_affected(&report, issue_id), 1, "{issue_id}");
    }
    assert_eq!(issue_affected(&report, "chatWorldbookReference"), 1);
    assert_eq!(issue_affected(&report, "chatMessageCountDrift"), 1);
    assert_eq!(issue_affected(&report, "chatPreviewDrift"), 1);
    assert_eq!(issue_affected(&report, "assistantVariantMissing"), 1);
    assert_eq!(issue_affected(&report, "strayMessageVariants"), 1);
    assert_eq!(issue_affected(&report, "activeVariantOutOfRange"), 1);
    assert_eq!(issue_affected(&report, "activeVariantContentMismatch"), 1);
    assert_eq!(issue_affected(&report, "contextCursorDangling"), 1);
    assert_eq!(issue_affected(&report, "semanticMemoryDanglingSource"), 1);
    assert!(report
        .issues
        .iter()
        .all(|issue| !issue.samples.is_empty() && issue.repairable));

    let repaired =
        repair_health_issues(&connection, Path::new("unused.sqlite3"), "1.0.0").expect("repair");

    for issue_id in [
        "foreignKeyViolation",
        "chatProviderReference",
        "chatPersonaReference",
        "chatCharacterReference",
        "chatStyleReference",
        "chatUniverseReference",
        "chatWorldbookReference",
        "chatMessageCountDrift",
        "chatPreviewDrift",
        "assistantVariantMissing",
        "strayMessageVariants",
        "activeVariantOutOfRange",
        "activeVariantContentMismatch",
        "contextCursorDangling",
        "semanticMemoryDanglingSource",
    ] {
        assert!(
            repaired_action_count(&repaired, issue_id) > 0,
            "repair action missing for {issue_id}"
        );
    }

    assert!(repaired.report.integrity_ok);
    assert!(repaired.report.issues.is_empty());
    assert_eq!(repaired.report.foreign_key_violations, 0);

    let chat_summary = |chat_id: &str| {
        connection
            .query_row(
                "SELECT message_count, preview FROM chats WHERE id = ?1",
                params![chat_id],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("chat must exist")
    };
    assert_eq!(chat_summary("chat-1"), (2, "Greetings, traveler".into()));
    assert_eq!(chat_summary("chat-2"), (3, "Second reply".into()));

    let optional_string = |sql: &str| -> Option<String> {
        connection
            .query_row(sql, [], |row| row.get::<_, Option<String>>(0))
            .expect("scalar query must return a row")
    };
    assert_eq!(
        optional_string("SELECT provider_id FROM chats WHERE id = 'chat-1'"),
        None
    );
    assert_eq!(
        optional_string("SELECT persona_id FROM chats WHERE id = 'chat-1'"),
        None
    );
    assert_eq!(
        connection
            .query_row("SELECT COUNT(*) FROM chat_worldbooks", [], |row| row
                .get::<_, i64>(0))
            .expect("count"),
        0
    );
    // The missing variant was rebuilt from the message content.
    assert_eq!(
        scalar(
            &connection,
            "SELECT content FROM message_variants WHERE message_id = 'chat-1-assistant'"
        ),
        "Greetings, traveler"
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT COUNT(*) FROM message_variants WHERE id = 'stray-variant'",
                [],
                |row| row.get::<_, i64>(0)
            )
            .expect("count"),
        0
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT active_variant_index FROM messages WHERE id = 'chat-2-second'",
                [],
                |row| row.get::<_, i64>(0)
            )
            .expect("index"),
        0
    );
    assert_eq!(
        scalar(
            &connection,
            "SELECT content FROM messages WHERE id = 'chat-2-second'"
        ),
        "Second reply"
    );
    assert_eq!(
        optional_string(
            "SELECT covered_through_message_id FROM chat_contexts WHERE chat_id = 'chat-1'"
        ),
        None
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT COUNT(*) FROM semantic_memories WHERE id = 'dangling-memory'",
                [],
                |row| row.get::<_, i64>(0)
            )
            .expect("count"),
        0
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT COUNT(*) FROM messages WHERE id = 'orphan-message'",
                [],
                |row| row.get::<_, i64>(0)
            )
            .expect("count"),
        0
    );
}

#[test]
fn repair_on_healthy_database_performs_no_actions() {
    let connection = test_database();
    create_conversation(&connection, "chat-1");

    let repaired =
        repair_health_issues(&connection, Path::new("unused.sqlite3"), "1.0.0").expect("repair");

    assert!(repaired.actions.is_empty());
    assert!(repaired.report.issues.is_empty());
    assert!(repaired.report.integrity_ok);
}
