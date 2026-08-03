use super::*;
use crate::models::{DynamicContextState, SemanticMemoryCandidate};

fn test_database() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .expect("foreign keys must enable");
    migrate(&connection).expect("schema must migrate");
    connection
}

fn create_test_chat(connection: &Connection, id: &str) {
    create_chat(
        connection,
        id,
        &ChatConfigInput {
            title: "Test chat".into(),
            greeting_message: None,
            provider_id: None,
            persona_id: None,
            character_id: None,
            universe_id: None,
            worldbook_ids: Vec::new(),
            prompt_config: PromptConfig::default(),
        },
    )
    .expect("chat must be created");
}

#[test]
fn greeting_message_creates_the_initial_assistant_variant() {
    let connection = test_database();
    create_chat(
        &connection,
        "chat-greeting",
        &ChatConfigInput {
            title: "Greeting chat".into(),
            greeting_message: Some("  hello, glad you're here  ".into()),
            provider_id: None,
            persona_id: None,
            character_id: None,
            universe_id: None,
            worldbook_ids: Vec::new(),
            prompt_config: PromptConfig::default(),
        },
    )
    .expect("chat with greeting must be created");

    let state = chat_state(&connection, "chat-greeting").expect("chat state must load");
    assert_eq!(state.chat.message_count, 1);
    assert_eq!(state.chat.preview, "hello, glad you're here");
    assert_eq!(state.messages.len(), 1);
    assert_eq!(state.messages[0].role, "assistant");
    assert_eq!(state.messages[0].content, "hello, glad you're here");
    assert_eq!(state.messages[0].variants.len(), 1);
    assert_eq!(
        state.messages[0].variants[0].content,
        "hello, glad you're here"
    );
}

#[test]
fn user_message_is_durable_before_assistant_response() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");

    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    assert_eq!(state.chat.message_count, 1);
    assert_eq!(state.chat.preview, "hello");
    assert_eq!(state.messages.len(), 1);
    assert_eq!(state.messages[0].role, "user");
    assert_eq!(state.messages[0].content, "hello");
}

#[test]
fn assistant_message_creates_initial_variant_and_updates_summary() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "hi")
        .expect("assistant message must persist");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    assert_eq!(state.chat.message_count, 2);
    assert_eq!(state.chat.preview, "hi");
    let assistant = state
        .messages
        .iter()
        .find(|message| message.id == "assistant-1")
        .expect("assistant message must exist");
    assert_eq!(assistant.variants.len(), 1);
    assert_eq!(assistant.variants[0].content, "hi");
}

#[test]
fn deleting_multiple_messages_updates_the_chat_once_and_keeps_the_remainder() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "first").expect("first message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "second")
        .expect("assistant message must persist");
    add_user_message(&connection, "chat-1", "user-2", "third").expect("last message must persist");

    delete_messages(
        &connection,
        &["user-1".to_string(), "assistant-1".to_string()],
    )
    .expect("selected messages must be deleted in one transaction");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    assert_eq!(state.chat.message_count, 1);
    assert_eq!(state.chat.preview, "third");
    assert_eq!(state.messages.len(), 1);
    assert_eq!(state.messages[0].id, "user-2");
}

#[test]
fn continuation_is_saved_as_a_separate_assistant_message() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "continue please")
        .expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "first part")
        .expect("initial assistant message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-2", "second part")
        .expect("continuation must persist as another assistant message");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    assert_eq!(state.chat.message_count, 3);
    assert_eq!(state.chat.preview, "second part");
    assert_eq!(state.messages.len(), 3);

    let first = state
        .messages
        .iter()
        .find(|message| message.id == "assistant-1")
        .expect("initial assistant message must remain");
    let continuation = state
        .messages
        .iter()
        .find(|message| message.id == "assistant-2")
        .expect("continuation message must exist");

    assert_eq!(first.content, "first part");
    assert_eq!(first.variants.len(), 1);
    assert_eq!(continuation.content, "second part");
    assert_eq!(continuation.variants.len(), 1);
}

#[test]
fn get_chat_loads_worldbooks_in_position_order() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    connection
        .execute_batch(
            "INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)
             VALUES ('worldbook-1', 'worldbook', 'World 1', '', '{}', '', 'amber', 1);
             INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)
             VALUES ('worldbook-2', 'worldbook', 'World 2', '', '{}', '', 'amber', 1);
             INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
             VALUES ('chat-1', 'worldbook-1', 1);
             INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
             VALUES ('chat-1', 'worldbook-2', 0);",
        )
        .expect("worldbook relations must insert");

    let chat = get_chat(&connection, "chat-1").expect("chat must load");
    assert_eq!(chat.worldbook_ids, vec!["worldbook-2", "worldbook-1"]);
}

#[test]
fn batched_chat_and_variant_loading_preserves_relations() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    create_test_chat(&connection, "chat-2");
    connection
        .execute(
            "INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)
             VALUES ('worldbook-1', 'worldbook', 'World', '', '{}', '', 'amber', 1)",
            [],
        )
        .expect("worldbook must insert");
    connection
        .execute(
            "INSERT INTO chat_worldbooks (chat_id, worldbook_id, position)
             VALUES ('chat-1', 'worldbook-1', 0)",
            [],
        )
        .expect("worldbook relation must insert");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "hi")
        .expect("assistant message must persist");
    append_message_variant(
        &connection,
        "assistant-1",
        "assistant-1-variant-1",
        "hello again",
        false,
    )
    .expect("variant must append");

    let chats = list_chats(&connection).expect("chats must load");
    let chat = chats
        .iter()
        .find(|chat| chat.id == "chat-1")
        .expect("chat must exist");
    assert_eq!(chat.worldbook_ids, vec!["worldbook-1"]);

    let messages = list_messages(&connection).expect("messages must load");
    let assistant = messages
        .iter()
        .find(|message| message.id == "assistant-1")
        .expect("assistant message must exist");
    assert_eq!(assistant.variants.len(), 2);
    assert_eq!(assistant.active_variant_index, 1);
    assert_eq!(assistant.content, "hello again");
}

#[test]
fn messages_through_assistant_uses_the_active_variant_and_excludes_later_messages() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "first answer")
        .expect("assistant message must persist");
    append_message_variant(
        &connection,
        "assistant-1",
        "assistant-1-variant-1",
        "selected answer",
        false,
    )
    .expect("variant must append");
    add_user_message(&connection, "chat-1", "user-2", "later message")
        .expect("later message must persist");

    let (chat_id, history) = messages_through_message(&connection, "assistant-1")
        .expect("history through assistant must load");

    assert_eq!(chat_id, "chat-1");
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].content, "hello");
    assert_eq!(history[1].role, "assistant");
    assert_eq!(history[1].content, "selected answer");
}

#[test]
fn messages_through_message_rejects_user_messages() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");

    let error = messages_through_message(&connection, "user-1")
        .expect_err("user messages cannot be continued");
    assert_eq!(error.key, keys::MESSAGE_CONTINUE_ASSISTANT_ONLY);
}

#[test]
fn usage_history_always_contains_at_least_six_weeks() {
    let connection = test_database();
    let points = usage_history(&connection).expect("usage history must load");
    assert!(points.len() >= 42);
    assert_eq!(points.last().unwrap().day - points.first().unwrap().day, 41);
}

#[test]
fn history_before_a_continuation_ends_with_an_assistant_message() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "first part")
        .expect("assistant message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-2", "continued part")
        .expect("continuation must persist");

    let (_, history) = messages_before_message(&connection, "assistant-2")
        .expect("history before continuation must load");
    assert_eq!(
        history.last().map(|message| message.role.as_str()),
        Some("assistant")
    );
}

#[test]
fn regeneration_history_is_stable_when_imported_messages_share_a_timestamp() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "hello").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "first part")
        .expect("assistant message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-2", "continued part")
        .expect("continuation must persist");
    connection
        .execute(
            "UPDATE messages SET created_at = 100 WHERE chat_id = 'chat-1'",
            [],
        )
        .expect("timestamps must update");

    let (_, history) = messages_before_message(&connection, "assistant-2")
        .expect("history before continuation must load");
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].role, "user");
    assert_eq!(history[1].role, "assistant");
    assert_eq!(history[1].content, "first part");
}

#[test]
fn ai_module_settings_round_trip_without_affecting_existing_preferences() {
    let connection = test_database();
    let mut settings = get_settings(&connection).expect("settings must load");
    settings.profile_name = "Tester".into();
    settings.focus_composer_after_send = false;
    settings.ai_modules.retry.max_attempts = 5;
    settings.ai_modules.dynamic_context.enabled = true;
    settings.ai_modules.dynamic_context.mode = "local".into();
    settings.ai_modules.semantic_memory.enabled = true;
    settings.ai_modules.semantic_memory.top_k = 12;

    update_settings(&connection, &settings).expect("settings must save");
    let loaded = get_settings(&connection).expect("settings must reload");

    assert_eq!(loaded.profile_name, "Tester");
    assert!(!loaded.focus_composer_after_send);
    assert_eq!(loaded.ai_modules.retry.max_attempts, 5);
    assert!(loaded.ai_modules.dynamic_context.enabled);
    assert_eq!(loaded.ai_modules.dynamic_context.mode, "local");
    assert!(loaded.ai_modules.semantic_memory.enabled);
    assert_eq!(loaded.ai_modules.semantic_memory.top_k, 12);
}

#[test]
fn dynamic_context_and_semantic_memory_are_invalidated_together() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    let state = DynamicContextState {
        summary: "User prefers concise answers.".into(),
        covered_through_message_id: Some("message-1".into()),
        ..DynamicContextState::default()
    };
    save_dynamic_context(&connection, "chat-1", &state).expect("dynamic context must save");

    let provider = Provider {
        id: "provider-1".into(),
        name: "Embedding provider".into(),
        kind: "ollama".into(),
        model: "chat-model".into(),
        status: "connected".into(),
        base_url: None,
        account_id: None,
        latency_ms: None,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
        embedding_model: Some("qwen3-embedding".into()),
        embedding_base_url: None,
        has_secret: false,
    };
    save_provider(&connection, &provider).expect("provider must save");
    upsert_semantic_memories(
        &connection,
        "chat-1",
        "provider-1",
        "qwen3-embedding",
        &[(
            SemanticMemoryCandidate {
                source_kind: "context-summary".into(),
                source_id: "summary".into(),
                content: "User prefers concise answers.".into(),
            },
            vec![0.1, 0.2, 0.3],
        )],
    )
    .expect("semantic memory must save");

    assert!(get_dynamic_context(&connection, "chat-1")
        .expect("context must load")
        .is_some());
    assert_eq!(
        list_semantic_memories(&connection, "chat-1", "provider-1", "qwen3-embedding")
            .expect("memories must load")
            .len(),
        1
    );

    invalidate_chat_ai_context(&connection, "chat-1").expect("derived AI context must invalidate");
    assert!(get_dynamic_context(&connection, "chat-1")
        .expect("context query must succeed")
        .is_none());
    assert!(
        list_semantic_memories(&connection, "chat-1", "provider-1", "qwen3-embedding")
            .expect("memory query must succeed")
            .is_empty()
    );
}

#[test]
fn semantic_memory_reindexes_changed_content_and_prunes_stale_sources() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    let provider = Provider {
        id: "provider-1".into(),
        name: "Embedding provider".into(),
        kind: "ollama".into(),
        model: "chat-model".into(),
        status: "connected".into(),
        base_url: None,
        account_id: None,
        latency_ms: None,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
        embedding_model: Some("qwen3-embedding".into()),
        embedding_base_url: None,
        has_secret: false,
    };
    save_provider(&connection, &provider).expect("provider must save");

    let original = SemanticMemoryCandidate {
        source_kind: "remembered-message".into(),
        source_id: "message-1".into(),
        content: "Original content".into(),
    };
    upsert_semantic_memories(
        &connection,
        "chat-1",
        "provider-1",
        "qwen3-embedding",
        &[(original.clone(), vec![1.0, 0.0])],
    )
    .expect("memory must save");

    let indexed =
        semantic_memory_indexed_contents(&connection, "chat-1", "provider-1", "qwen3-embedding")
            .expect("indexed contents must load");
    assert_eq!(
        indexed
            .get(&("remembered-message".into(), "message-1".into()))
            .map(String::as_str),
        Some("Original content")
    );

    let changed = SemanticMemoryCandidate {
        content: "Changed content".into(),
        ..original
    };
    upsert_semantic_memories(
        &connection,
        "chat-1",
        "provider-1",
        "qwen3-embedding",
        &[(changed.clone(), vec![0.0, 1.0])],
    )
    .expect("changed memory must update");
    prune_semantic_memories(&connection, "chat-1", "provider-1", "qwen3-embedding", &[])
        .expect("stale memory must prune");
    assert!(
        list_semantic_memories(&connection, "chat-1", "provider-1", "qwen3-embedding")
            .expect("memory query must succeed")
            .is_empty()
    );
}

#[test]
fn message_interaction_time_and_edited_marker_follow_the_active_content() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "user-1", "draft").expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "original")
        .expect("assistant message must persist");
    connection
        .execute(
            "UPDATE messages SET created_at = 1, updated_at = 1 WHERE chat_id = 'chat-1'",
            [],
        )
        .expect("timestamps must be arranged");

    edit_message(&connection, "user-1", "unused", "edited user").expect("user edit must persist");
    append_message_variant(
        &connection,
        "assistant-1",
        "assistant-1-regenerated",
        "regenerated",
        false,
    )
    .expect("regeneration must append");
    edit_message(
        &connection,
        "assistant-1",
        "assistant-1-edited",
        "edited assistant",
    )
    .expect("assistant edit must append");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    let user = state
        .messages
        .iter()
        .find(|message| message.id == "user-1")
        .expect("user message");
    let assistant = state
        .messages
        .iter()
        .find(|message| message.id == "assistant-1")
        .expect("assistant message");
    assert!(user.edited);
    assert!(user.updated_at > user.created_at);
    assert!(assistant.edited);
    assert_eq!(assistant.content, "edited assistant");
    assert!(assistant.updated_at > assistant.created_at);

    select_message_variant(&connection, "assistant-1", 1).expect("regenerated variant must select");
    let state = chat_state(&connection, "chat-1").expect("chat state must reload");
    let assistant = state
        .messages
        .iter()
        .find(|message| message.id == "assistant-1")
        .expect("assistant message");
    assert!(!assistant.edited);
    assert_eq!(assistant.content, "regenerated");
}
