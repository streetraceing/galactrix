use super::*;
use crate::models::{
    BudgetSettings, DynamicContextState, GalaxyItemInput, GenerationReport, PromptSnippet,
    ReportModules, ReportSection, ReportTokenEstimate, ReportTruncation, ReportedTokenUsage,
    SemanticMemoryCandidate,
};

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
            auto_title: false,
            automatic_title_base: None,
            greeting_message: Some("  hello, glad you're here  ".into()),
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
fn editing_or_deleting_the_initial_message_keeps_chat_greeting_in_sync() {
    let connection = test_database();
    let input = ChatConfigInput {
        title: "Greeting chat".into(),
        auto_title: false,
        automatic_title_base: None,
        greeting_message: Some("hello".into()),
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
    };
    create_chat(&connection, "chat-greeting-sync", &input).expect("chat must save");

    edit_message(
        &connection,
        "chat-greeting-sync-greeting",
        "chat-greeting-sync-greeting-edited",
        "welcome back",
    )
    .expect("greeting must edit");
    assert_eq!(
        get_chat(&connection, "chat-greeting-sync")
            .expect("chat must load")
            .greeting_message
            .as_deref(),
        Some("welcome back")
    );

    delete_message(&connection, "chat-greeting-sync-greeting").expect("greeting must delete");
    assert_eq!(
        get_chat(&connection, "chat-greeting-sync")
            .expect("chat must reload")
            .greeting_message,
        None
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

#[test]
fn chat_style_override_is_persisted_and_used_in_prompt_context() {
    let connection = test_database();
    upsert_galaxy_item(
        &connection,
        "style-chat",
        &crate::models::GalaxyItemInput {
            id: Some("style-chat".into()),
            kind: "style".into(),
            name: "Direct style".into(),
            description: "Fallback notes".into(),
            data: serde_json::json!({
                "instructions": "Answer in clipped sentences.",
                "example": "Understood. Moving now."
            }),
        },
    )
    .expect("style must save");

    create_chat(
        &connection,
        "chat-style",
        &ChatConfigInput {
            title: "Styled chat".into(),
            auto_title: false,
            automatic_title_base: None,
            greeting_message: None,
            provider_id: None,
            persona_id: None,
            character_id: None,
            style_item_id: Some("style-chat".into()),
            universe_id: None,
            worldbook_ids: Vec::new(),
            tags: Vec::new(),
            prompt_config: PromptConfig::default(),
            generation_settings: Default::default(),
            module_overrides: Default::default(),
        },
    )
    .expect("chat must save");

    let chat = get_chat(&connection, "chat-style").expect("chat must load");
    assert_eq!(chat.style_item_id.as_deref(), Some("style-chat"));

    let context = get_chat_prompt_context(&connection, "chat-style").expect("context must load");
    assert_eq!(
        context
            .character_style
            .as_ref()
            .map(|style| style.id.as_str()),
        Some("style-chat")
    );
}

#[test]
fn deleting_style_unlinks_direct_chat_override() {
    let connection = test_database();
    upsert_galaxy_item(
        &connection,
        "style-chat",
        &crate::models::GalaxyItemInput {
            id: Some("style-chat".into()),
            kind: "style".into(),
            name: "Direct style".into(),
            description: String::new(),
            data: serde_json::json!({"instructions": "Be concise.", "example": ""}),
        },
    )
    .expect("style must save");

    create_chat(
        &connection,
        "chat-style",
        &ChatConfigInput {
            title: "Styled chat".into(),
            auto_title: false,
            automatic_title_base: None,
            greeting_message: None,
            provider_id: None,
            persona_id: None,
            character_id: None,
            style_item_id: Some("style-chat".into()),
            universe_id: None,
            worldbook_ids: Vec::new(),
            tags: Vec::new(),
            prompt_config: PromptConfig::default(),
            generation_settings: Default::default(),
            module_overrides: Default::default(),
        },
    )
    .expect("chat must save");

    delete_galaxy_item(&connection, "style-chat").expect("style must delete");
    let chat = get_chat(&connection, "chat-style").expect("chat must load");
    assert_eq!(chat.style_item_id, None);
}

#[test]
fn chat_module_overrides_persist_update_and_clone() {
    let connection = test_database();
    let mut input = ChatConfigInput {
        title: "Module chat".into(),
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
        module_overrides: crate::models::ChatModuleOverrides {
            retry: Some(false),
            context_budget: Some(true),
            ..Default::default()
        },
    };

    create_chat(&connection, "chat-modules", &input).expect("chat must save");
    let saved = get_chat(&connection, "chat-modules").expect("chat must load");
    assert_eq!(saved.module_overrides.retry, Some(false));
    assert_eq!(saved.module_overrides.context_budget, Some(true));
    assert_eq!(saved.module_overrides.semantic_memory, None);

    input.module_overrides = crate::models::ChatModuleOverrides {
        semantic_memory: Some(true),
        response_cleanup: Some(true),
        ..Default::default()
    };
    update_chat_config(&connection, "chat-modules", &input).expect("chat must update");
    let updated = get_chat(&connection, "chat-modules").expect("chat must reload");
    assert_eq!(updated.module_overrides.retry, None);
    assert_eq!(updated.module_overrides.semantic_memory, Some(true));
    assert_eq!(updated.module_overrides.response_cleanup, Some(true));

    clone_chat(
        &connection,
        "chat-modules",
        "chat-modules-copy",
        "Module chat copy",
        false,
        None,
    )
    .expect("chat must clone");
    let cloned = get_chat(&connection, "chat-modules-copy").expect("clone must load");
    assert_eq!(cloned.module_overrides, updated.module_overrides);
}

#[test]
fn full_backup_round_trip_preserves_messages_variants_settings_and_usage() {
    let source = test_database();
    create_test_chat(&source, "backup-chat");
    add_user_message(&source, "backup-chat", "backup-user", "hello")
        .expect("user message must save");
    add_assistant_message(&source, "backup-chat", "backup-assistant", "first answer")
        .expect("assistant message must save");
    append_message_variant(
        &source,
        "backup-assistant",
        "backup-assistant-variant-1",
        "better answer",
        true,
    )
    .expect("variant must save");
    let mut settings = get_settings(&source).expect("settings must load");
    settings.profile_name = "Backup profile".into();
    update_settings(&source, &settings).expect("settings must save");
    source
        .execute(
            "INSERT INTO usage_events (id, provider_id, model, input_tokens, output_tokens, request_count, created_at)
             VALUES ('backup-usage', NULL, 'model', 120, 40, 1, ?1)",
            params![now_unix()],
        )
        .expect("usage must save");

    let data = backup_data(&source).expect("backup data must export");
    validate_backup_data(&data).expect("exported backup must validate");

    let restored = test_database();
    create_test_chat(&restored, "replaced-chat");
    let transaction = restored
        .unchecked_transaction()
        .expect("restore transaction must start");
    replace_with_backup(&transaction, &data).expect("backup must restore");
    transaction.commit().expect("restore must commit");

    let state = chat_state(&restored, "backup-chat").expect("restored chat must load");
    assert_eq!(state.messages.len(), 2);
    assert_eq!(state.messages[1].content, "better answer");
    assert_eq!(state.messages[1].active_variant_index, 1);
    assert_eq!(state.messages[1].variants.len(), 2);
    assert!(get_chat(&restored, "replaced-chat").is_err());
    assert_eq!(
        get_settings(&restored)
            .expect("restored settings must load")
            .profile_name,
        "Backup profile"
    );
    assert!(usage_history(&restored)
        .expect("restored usage must load")
        .iter()
        .any(|point| point.input_tokens == 120
            && point.output_tokens == 40
            && point.requests == 1));
}

#[test]
fn backup_remains_valid_after_a_variant_updates_a_future_message() {
    let source = test_database();
    create_test_chat(&source, "backup-timestamp-chat");
    add_assistant_message(
        &source,
        "backup-timestamp-chat",
        "backup-timestamp-assistant",
        "first answer",
    )
    .expect("assistant message must save");

    // Rapidly sequenced messages may have timestamps ahead of the wall clock.
    // Later edits must never move their updated_at value backwards.
    let future_timestamp = now_unix().saturating_add(60);
    source
        .execute(
            "UPDATE messages SET created_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![future_timestamp, "backup-timestamp-assistant"],
        )
        .expect("assistant timestamp must advance");
    source
        .execute(
            "UPDATE message_variants SET created_at = ?1 WHERE message_id = ?2",
            params![future_timestamp, "backup-timestamp-assistant"],
        )
        .expect("variant timestamp must advance");
    source
        .execute(
            "UPDATE chats SET updated_at = ?1 WHERE id = ?2",
            params![future_timestamp, "backup-timestamp-chat"],
        )
        .expect("chat timestamp must advance");

    append_message_variant(
        &source,
        "backup-timestamp-assistant",
        "backup-timestamp-assistant-variant-1",
        "better answer",
        true,
    )
    .expect("variant must save");

    let assistant = messages_for_chat(&source, "backup-timestamp-chat")
        .expect("messages must load")
        .into_iter()
        .next()
        .expect("assistant message must exist");
    assert!(assistant.updated_at >= assistant.created_at);

    let data = backup_data(&source).expect("backup data must export");
    validate_backup_data(&data).expect("exported backup must validate");
}

#[test]
fn failed_backup_replacement_rolls_back_existing_data() {
    let source = test_database();
    create_test_chat(&source, "backup-chat");
    let mut data = backup_data(&source).expect("backup data must export");
    data.settings.profile_avatar = Some("https://example.com/not-inline.png".into());

    let target = test_database();
    create_test_chat(&target, "existing-chat");
    let transaction = target
        .unchecked_transaction()
        .expect("restore transaction must start");
    let error = replace_with_backup(&transaction, &data).expect_err("restore must fail");
    assert_eq!(error.key, keys::PROFILE_IMAGE_UNSUPPORTED);
    transaction
        .rollback()
        .expect("failed restore must roll back");

    assert!(get_chat(&target, "existing-chat").is_ok());
    assert!(get_chat(&target, "backup-chat").is_err());
}

#[test]
fn chat_generation_overrides_persist_update_and_clone() {
    let connection = test_database();
    let mut input = ChatConfigInput {
        title: "Generation chat".into(),
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
        generation_settings: crate::models::ChatGenerationSettings {
            temperature: Some(0.25),
            top_p: Some(0.8),
            max_tokens: Some(2048),
        },
        module_overrides: Default::default(),
    };

    create_chat(&connection, "chat-generation", &input).expect("chat must save");
    let saved = get_chat(&connection, "chat-generation").expect("chat must load");
    assert_eq!(saved.generation_settings.temperature, Some(0.25));
    assert_eq!(saved.generation_settings.top_p, Some(0.8));
    assert_eq!(saved.generation_settings.max_tokens, Some(2048));

    input.generation_settings.top_p = None;
    input.generation_settings.max_tokens = Some(4096);
    update_chat_config(&connection, "chat-generation", &input).expect("chat must update");
    clone_chat(
        &connection,
        "chat-generation",
        "chat-generation-copy",
        "Generation chat copy",
        false,
        None,
    )
    .expect("chat must clone");
    let cloned = get_chat(&connection, "chat-generation-copy").expect("clone must load");
    assert_eq!(cloned.generation_settings.temperature, Some(0.25));
    assert_eq!(cloned.generation_settings.top_p, None);
    assert_eq!(cloned.generation_settings.max_tokens, Some(4096));
}

#[test]
fn chat_response_length_override_persists_updates_and_clones() {
    let connection = test_database();
    let prompt_config = PromptConfig {
        response_length: "micro".into(),
        ..Default::default()
    };
    let mut input = ChatConfigInput {
        title: "Length chat".into(),
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
        prompt_config,
        generation_settings: Default::default(),
        module_overrides: Default::default(),
    };

    create_chat(&connection, "chat-length", &input).expect("chat must save");
    assert_eq!(
        get_chat(&connection, "chat-length")
            .expect("chat must load")
            .prompt_config
            .response_length,
        "micro"
    );

    input.prompt_config.response_length = "long".into();
    update_chat_config(&connection, "chat-length", &input).expect("chat must update");
    clone_chat(
        &connection,
        "chat-length",
        "chat-length-copy",
        "Length chat copy",
        false,
        None,
    )
    .expect("chat must clone");

    assert_eq!(
        get_chat(&connection, "chat-length-copy")
            .expect("clone must load")
            .prompt_config
            .response_length,
        "long"
    );
}

#[test]
fn blank_new_chat_title_uses_character_name_and_sequence() {
    let connection = test_database();
    connection
        .execute(
            "INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)\n             VALUES ('character-auto-title', 'character', 'Alice', '', '{}', '', 'violet', 1)",
            [],
        )
        .expect("character must insert");

    let input = ChatConfigInput {
        title: String::new(),
        auto_title: true,
        automatic_title_base: Some("Chat".into()),
        greeting_message: None,
        provider_id: None,
        persona_id: None,
        character_id: Some("character-auto-title".into()),
        style_item_id: None,
        universe_id: None,
        worldbook_ids: Vec::new(),
        tags: Vec::new(),
        prompt_config: PromptConfig::default(),
        generation_settings: Default::default(),
        module_overrides: Default::default(),
    };

    let first = create_chat(&connection, "chat-auto-1", &input).expect("first chat must save");
    let second = create_chat(&connection, "chat-auto-2", &input).expect("second chat must save");

    assert_eq!(first, "Alice #1");
    assert_eq!(second, "Alice #2");
    assert_eq!(
        get_chat(&connection, "chat-auto-2")
            .expect("chat must load")
            .title,
        "Alice #2"
    );
}

#[test]
fn blank_clone_title_continues_character_chat_sequence() {
    let connection = test_database();
    connection
        .execute(
            "INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)\n             VALUES ('character-clone-title', 'character', 'Alice', '', '{}', '', 'violet', 1)",
            [],
        )
        .expect("character must insert");

    let input = ChatConfigInput {
        title: String::new(),
        auto_title: true,
        automatic_title_base: Some("Chat".into()),
        greeting_message: None,
        provider_id: None,
        persona_id: None,
        character_id: Some("character-clone-title".into()),
        style_item_id: None,
        universe_id: None,
        worldbook_ids: Vec::new(),
        tags: Vec::new(),
        prompt_config: PromptConfig::default(),
        generation_settings: Default::default(),
        module_overrides: Default::default(),
    };

    create_chat(&connection, "chat-clone-1", &input).expect("first chat must save");
    create_chat(&connection, "chat-clone-2", &input).expect("second chat must save");
    let title = clone_chat(&connection, "chat-clone-1", "chat-clone-3", "", false, None)
        .expect("chat must clone");

    assert_eq!(title, "Alice #3");
    assert_eq!(
        get_chat(&connection, "chat-clone-3")
            .expect("clone must load")
            .title,
        "Alice #3"
    );
}

#[test]
fn character_accepts_contextual_message_style_presets() {
    let connection = test_database();

    for preset in ["short-messages", "long-messages", "coherent-thought"] {
        let id = format!("character-{preset}");
        upsert_galaxy_item(
            &connection,
            &id,
            &crate::models::GalaxyItemInput {
                id: Some(id.clone()),
                kind: "character".into(),
                name: format!("Character {preset}"),
                description: String::new(),
                data: serde_json::json!({
                    "definitionSections": [],
                    "stylePreset": preset,
                    "promptSetIds": []
                }),
            },
        )
        .expect("new built-in style preset must save");
    }
}

#[test]
fn archived_chat_is_read_only_until_restored() {
    let connection = test_database();
    create_test_chat(&connection, "chat-archive");
    add_user_message(&connection, "chat-archive", "archive-user-1", "hello")
        .expect("initial message must persist");
    set_chat_pinned(&connection, "chat-archive", true).expect("chat must pin");

    set_chat_archived(&connection, "chat-archive", true).expect("chat must archive");
    let archived = get_chat(&connection, "chat-archive").expect("chat must load");
    assert!(archived.archived);
    assert!(!archived.pinned);

    let error = add_user_message(
        &connection,
        "chat-archive",
        "archive-user-2",
        "must not be added",
    )
    .expect_err("archived chat must reject mutations");
    assert_eq!(error.key, keys::CHAT_ARCHIVED_READ_ONLY);

    let edit_error = edit_message(
        &connection,
        "archive-user-1",
        "unused-archive-variant",
        "edited",
    )
    .expect_err("archived messages must be read-only");
    assert_eq!(edit_error.key, keys::CHAT_ARCHIVED_READ_ONLY);

    set_chat_archived(&connection, "chat-archive", false).expect("chat must restore");
    add_user_message(&connection, "chat-archive", "archive-user-2", "works again")
        .expect("restored chat must accept messages");
    assert!(
        !get_chat(&connection, "chat-archive")
            .expect("restored chat must load")
            .archived
    );
}

#[test]
fn rewind_chat_keeps_target_and_removes_only_later_messages() {
    let connection = test_database();
    create_test_chat(&connection, "chat-rewind");
    add_user_message(&connection, "chat-rewind", "rewind-1", "first")
        .expect("first message must persist");
    add_assistant_message(&connection, "chat-rewind", "rewind-2", "second")
        .expect("second message must persist");
    add_user_message(&connection, "chat-rewind", "rewind-3", "third")
        .expect("third message must persist");
    add_assistant_message(&connection, "chat-rewind", "rewind-4", "fourth")
        .expect("fourth message must persist");

    rewind_chat_to_message(&connection, "rewind-2").expect("chat must rewind");

    let state = chat_state(&connection, "chat-rewind").expect("chat state must load");
    let ids = state
        .messages
        .iter()
        .map(|message| message.id.as_str())
        .collect::<Vec<_>>();
    assert_eq!(ids, vec!["rewind-1", "rewind-2"]);
    assert_eq!(state.chat.message_count, 2);
    assert_eq!(state.chat.preview, "second");
}

#[test]
fn rewind_uses_message_order_when_timestamps_match() {
    let connection = test_database();
    create_test_chat(&connection, "chat-rewind-tie");
    add_user_message(&connection, "chat-rewind-tie", "tie-1", "first")
        .expect("first message must persist");
    add_assistant_message(&connection, "chat-rewind-tie", "tie-2", "second")
        .expect("second message must persist");
    add_user_message(&connection, "chat-rewind-tie", "tie-3", "third")
        .expect("third message must persist");
    add_assistant_message(&connection, "chat-rewind-tie", "tie-4", "fourth")
        .expect("fourth message must persist");
    connection
        .execute(
            "UPDATE messages SET created_at = 100, updated_at = 100 WHERE chat_id = 'chat-rewind-tie'",
            [],
        )
        .expect("timestamps must match");

    rewind_chat_to_message(&connection, "tie-2").expect("chat must rewind");

    let state = chat_state(&connection, "chat-rewind-tie").expect("chat state must load");
    let ids = state
        .messages
        .iter()
        .map(|message| message.id.as_str())
        .collect::<Vec<_>>();
    assert_eq!(ids, vec!["tie-1", "tie-2"]);
    assert_eq!(state.chat.preview, "second");
}

#[test]
fn branch_stops_at_the_exact_message_when_timestamps_match() {
    let connection = test_database();
    create_test_chat(&connection, "chat-branch-tie");
    add_user_message(&connection, "chat-branch-tie", "branch-1", "first")
        .expect("first message must persist");
    add_assistant_message(&connection, "chat-branch-tie", "branch-2", "second")
        .expect("second message must persist");
    add_user_message(&connection, "chat-branch-tie", "branch-3", "third")
        .expect("third message must persist");
    connection
        .execute(
            "UPDATE messages SET created_at = 100, updated_at = 100 WHERE chat_id = 'chat-branch-tie'",
            [],
        )
        .expect("timestamps must match");

    clone_chat(
        &connection,
        "chat-branch-tie",
        "chat-branch-copy",
        "Branch copy",
        true,
        Some("branch-2"),
    )
    .expect("branch must clone");

    let state = chat_state(&connection, "chat-branch-copy").expect("branch must load");
    let contents = state
        .messages
        .iter()
        .map(|message| message.content.as_str())
        .collect::<Vec<_>>();
    assert_eq!(contents, vec!["first", "second"]);
    assert_eq!(state.chat.preview, "second");
}

#[test]
fn chat_tags_normalize_on_create_and_bulk_assign() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    create_test_chat(&connection, "chat-2");

    let updated = assign_chat_tags(
        &connection,
        &["chat-1".into(), "chat-2".into()],
        &[" Work ".into(), "sci-fi".into(), "Work".into()],
        &[],
    )
    .expect("bulk assignment must succeed");
    assert_eq!(updated, 2);

    let chat = get_chat(&connection, "chat-1").expect("chat must load");
    assert_eq!(chat.tags, vec!["Work".to_string(), "sci-fi".to_string()]);

    assign_chat_tags(&connection, &["chat-1".into()], &[], &["Work".into()])
        .expect("removal must succeed");
    let chat = get_chat(&connection, "chat-1").expect("chat must load");
    assert_eq!(chat.tags, vec!["sci-fi".to_string()]);

    let chat = get_chat(&connection, "chat-2").expect("chat must load");
    assert_eq!(chat.tags, vec!["Work".to_string(), "sci-fi".to_string()]);
}

#[test]
fn assign_chat_tags_rejects_archived_chats_and_invalid_tags() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    create_test_chat(&connection, "chat-2");
    set_chat_archived(&connection, "chat-1", true).expect("chat must archive");

    let error = assign_chat_tags(&connection, &["chat-1".into()], &["x".into()], &[])
        .expect_err("archived chats must reject tag edits");
    assert_eq!(error.key, keys::CHAT_ARCHIVED_READ_ONLY);

    let too_long = "x".repeat(41);
    let error = assign_chat_tags(&connection, &["chat-2".into()], &[too_long], &[])
        .expect_err("oversized tags must be rejected");
    assert_eq!(error.key, keys::CHAT_TAGS_INVALID);

    let error = assign_chat_tags(&connection, &["chat-2".into()], &["Work".into()], &[])
        .expect("active chats still accept tags");
    assert_eq!(error, 1);
}

#[test]
fn mark_chat_read_persists_the_read_timestamp() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");

    let chat = get_chat(&connection, "chat-1").expect("chat must load");
    assert_eq!(chat.last_read_at, 0);

    let read_at = mark_chat_read(&connection, "chat-1").expect("mark read must succeed");
    assert!(read_at > 0);
    let chat = get_chat(&connection, "chat-1").expect("chat must load");
    assert_eq!(chat.last_read_at, read_at);

    let error = mark_chat_read(&connection, "missing-chat").expect_err("missing chat must fail");
    assert_eq!(error.key, keys::CHAT_NOT_FOUND);
}

#[test]
fn cloned_chats_inherit_tags_but_start_unread() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    assign_chat_tags(&connection, &["chat-1".into()], &["story".into()], &[])
        .expect("tags must be assigned");
    let source = get_chat(&connection, "chat-1").expect("chat must load");
    mark_chat_read(&connection, "chat-1").expect("mark read must succeed");

    clone_chat(&connection, "chat-1", "chat-copy", "Copy", false, None)
        .expect("clone must succeed");

    let copy = get_chat(&connection, "chat-copy").expect("copy must load");
    assert_eq!(copy.tags, vec!["story".to_string()]);
    assert_eq!(copy.last_read_at, 0);
    let _ = source;
}

#[test]
fn generation_reports_round_trip_through_variants() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "chat-1-user", "Hello")
        .expect("user message must be created");
    add_assistant_message(&connection, "chat-1", "chat-1-assistant", "Reply")
        .expect("assistant message must be created");

    let report = GenerationReport {
        created_at: 42,
        provider_id: "provider-1".into(),
        provider_name: "Lab".into(),
        model: "gpt-test".into(),
        mode: "send".into(),
        latency_ms: Some(812),
        reported_usage: Some(ReportedTokenUsage {
            input_tokens: 320,
            output_tokens: 96,
        }),
        estimated_tokens: ReportTokenEstimate {
            system_tokens: 210,
            history_tokens: 84,
            total_tokens: 294,
        },
        sections: vec![ReportSection {
            id: "responseRules".into(),
            title: "RESPONSE RULES".into(),
            priority: "normal".into(),
            included: true,
            approximate_tokens: 24,
            omitted_reason: None,
        }],
        prompt_rules: vec!["first-person".into()],
        truncations: vec![ReportTruncation {
            id: "recentMessageLimit".into(),
            before: 12,
            after: 8,
        }],
        modules: ReportModules {
            dynamic_context: true,
            dynamic_context_analysis: false,
            semantic_memory: true,
            semantic_memory_selected: 3,
            repetition_guard: true,
            response_cleanup: vec!["collapseBlankLines".into()],
        },
    };

    save_message_variant_report(&connection, "chat-1-assistant", 0, &report)
        .expect("report must save");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    let stored = state
        .messages
        .iter()
        .find(|message| message.id == "chat-1-assistant")
        .expect("assistant message must load")
        .variants
        .iter()
        .find(|variant| variant.index == 0)
        .expect("variant must exist")
        .report
        .clone()
        .expect("report must round-trip");
    assert_eq!(stored.created_at, 42);
    assert_eq!(stored.provider_name, "Lab");
    assert_eq!(stored.latency_ms, Some(812));
    assert_eq!(
        stored
            .reported_usage
            .as_ref()
            .map(|usage| usage.input_tokens),
        Some(320)
    );
    assert_eq!(stored.estimated_tokens.total_tokens, 294);
    assert_eq!(stored.sections[0].id, "responseRules");
    assert_eq!(stored.truncations[0].id, "recentMessageLimit");
    assert_eq!(stored.modules.semantic_memory_selected, 3);

    // A second assistant message saved without a report loads as reportless.
    add_assistant_message(&connection, "chat-1", "chat-1-second", "Another")
        .expect("second message must be created");
    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    let second = state
        .messages
        .iter()
        .find(|message| message.id == "chat-1-second")
        .expect("second message must load");
    assert!(second.variants[0].report.is_none());
}

#[test]
fn variant_feedback_round_trips_and_validates() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "chat-1-user", "Hello")
        .expect("user message must be created");
    add_assistant_message(&connection, "chat-1", "chat-1-assistant", "First reply")
        .expect("assistant message must be created");
    append_message_variant(
        &connection,
        "chat-1-assistant",
        "chat-1-v1",
        "Second reply",
        false,
    )
    .expect("second variant must be created");

    set_variant_feedback(
        &connection,
        "chat-1-assistant",
        1,
        Some(4),
        Some("  Better tone.  "),
    )
    .expect("feedback must save");

    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    let second = state
        .messages
        .iter()
        .find(|message| message.id == "chat-1-assistant")
        .expect("assistant message must load")
        .variants
        .iter()
        .find(|variant| variant.index == 1)
        .expect("variant must exist")
        .clone();
    assert_eq!(second.rating, Some(4));
    assert_eq!(second.note.as_deref(), Some("Better tone."));

    // Clearing with both None resets the feedback.
    set_variant_feedback(&connection, "chat-1-assistant", 1, None, None)
        .expect("feedback must clear");
    let state = chat_state(&connection, "chat-1").expect("chat state must load");
    let cleared = state
        .messages
        .iter()
        .find(|message| message.id == "chat-1-assistant")
        .expect("assistant message must load")
        .variants
        .iter()
        .find(|variant| variant.index == 1)
        .expect("variant must exist")
        .clone();
    assert_eq!(cleared.rating, None);
    assert_eq!(cleared.note, None);

    let error = set_variant_feedback(&connection, "chat-1-assistant", 1, Some(6), None)
        .expect_err("out-of-range ratings must be rejected");
    assert_eq!(error.key, keys::MESSAGE_VARIANT_RATING_RANGE);

    let long_note = "x".repeat(501);
    let error = set_variant_feedback(&connection, "chat-1-assistant", 1, None, Some(&long_note))
        .expect_err("oversized notes must be rejected");
    assert_eq!(error.key, keys::MESSAGE_VARIANT_NOTE_TOO_LONG);

    let error = set_variant_feedback(&connection, "missing-message", 0, Some(1), None)
        .expect_err("missing messages must be rejected");
    assert_eq!(error.key, keys::MESSAGE_NOT_FOUND);
}

#[test]
fn variant_feedback_is_rejected_on_archived_chats() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_assistant_message(&connection, "chat-1", "chat-1-assistant", "Reply")
        .expect("assistant message must be created");
    set_chat_archived(&connection, "chat-1", true).expect("chat must archive");

    let error = set_variant_feedback(&connection, "chat-1-assistant", 0, Some(3), None)
        .expect_err("archived chats must reject feedback");
    assert_eq!(error.key, keys::CHAT_ARCHIVED_READ_ONLY);
}

#[test]
fn galaxy_edits_snapshot_and_restore_is_itself_reversible() {
    let connection = test_database();
    let base = GalaxyItemInput {
        id: None,
        kind: "style".into(),
        name: "Clipped".into(),
        description: String::new(),
        data: serde_json::json!({ "instructions": "Be brief." }),
    };
    let first = upsert_galaxy_item(&connection, "style-1", &base).expect("item must be created");

    let mut edited = base.clone();
    edited.data = serde_json::json!({ "instructions": "Be shorter." });
    upsert_galaxy_item(&connection, "style-1", &edited).expect("edit must save");
    // No-op saves must not create noise revisions.
    upsert_galaxy_item(&connection, "style-1", &edited).expect("noop must save");

    let revisions =
        list_entity_revisions(&connection, "galaxy", "style-1").expect("revisions must list");
    assert_eq!(revisions.len(), 1);
    assert_eq!(revisions[0].origin, "edit");
    assert_eq!(revisions[0].payload["data"]["instructions"], "Be brief.");

    restore_entity_revision(&connection, "galaxy", "style-1", &revisions[0].id)
        .expect("restore must work");
    let restored = get_galaxy_item(&connection, "style-1").expect("item must load");
    assert_eq!(restored.data["instructions"], "Be brief.");
    assert_eq!(restored.description, first.description);

    // The restore recorded the replaced state, so it can be undone.
    let revisions =
        list_entity_revisions(&connection, "galaxy", "style-1").expect("revisions must list");
    assert_eq!(revisions.len(), 2);
    assert_eq!(revisions[0].origin, "restore");
    assert_eq!(revisions[0].payload["data"]["instructions"], "Be shorter.");

    // History is bounded per entity.
    for index in 0..25 {
        edited.data = serde_json::json!({ "instructions": format!("Round {index}.") });
        upsert_galaxy_item(&connection, "style-1", &edited).expect("edit must save");
    }
    let revisions =
        list_entity_revisions(&connection, "galaxy", "style-1").expect("revisions must list");
    assert_eq!(revisions.len(), 20);
}

#[test]
fn user_message_edits_snapshot_and_restore() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");
    add_user_message(&connection, "chat-1", "msg-1", "Original question")
        .expect("message must be created");

    edit_message(&connection, "msg-1", "unused", "Edited question").expect("edit must save");
    let revisions =
        list_entity_revisions(&connection, "message", "msg-1").expect("revisions must list");
    assert_eq!(revisions.len(), 1);
    assert_eq!(revisions[0].payload["content"], "Original question");

    // Assistant edits keep their history in variants instead.
    add_assistant_message(&connection, "chat-1", "msg-2", "Reply")
        .expect("assistant message must be created");
    edit_message(&connection, "msg-2", "msg-2-v1", "Edited reply")
        .expect("assistant edit must save");
    let assistant_revisions =
        list_entity_revisions(&connection, "message", "msg-2").expect("must list");
    assert!(assistant_revisions.is_empty());

    restore_entity_revision(&connection, "message", "msg-1", &revisions[0].id)
        .expect("restore must work");
    let restored: String = connection
        .query_row(
            "SELECT content FROM messages WHERE id = 'msg-1'",
            [],
            |row| row.get(0),
        )
        .expect("message must load");
    assert_eq!(restored, "Original question");

    // Restores of another message's revision cannot cross entities.
    let error = restore_entity_revision(&connection, "message", "msg-2", &revisions[0].id)
        .expect_err("foreign revisions must not restore");
    assert_eq!(error.key, keys::REVISION_NOT_FOUND);
}

#[test]
fn orphan_revisions_are_pruned_on_open() {
    let connection = test_database();
    let input = GalaxyItemInput {
        id: None,
        kind: "persona".into(),
        name: "Explorer".into(),
        description: String::new(),
        data: serde_json::json!({}),
    };
    upsert_galaxy_item(&connection, "persona-1", &input).expect("item must exist");
    let mut edited = input.clone();
    edited.description = "Updated".into();
    upsert_galaxy_item(&connection, "persona-1", &edited).expect("edit must save");
    assert_eq!(
        list_entity_revisions(&connection, "galaxy", "persona-1")
            .expect("must list")
            .len(),
        1
    );

    delete_galaxy_item(&connection, "persona-1").expect("item must be deleted");
    crate::db::revisions::prune_orphan_revisions(&connection).expect("prune must work");

    assert!(list_entity_revisions(&connection, "galaxy", "persona-1")
        .expect("must list")
        .is_empty());
}

#[test]
fn setup_complete_round_trips_through_settings() {
    let connection = test_database();
    let settings = get_settings(&connection).expect("settings must load");
    assert!(!settings.setup_complete);

    let mut updated = settings;
    updated.setup_complete = true;
    updated.profile_name = "Explorer".into();
    update_settings(&connection, &updated).expect("settings must save");

    let reloaded = get_settings(&connection).expect("settings must load");
    assert!(reloaded.setup_complete);
    assert_eq!(reloaded.profile_name, "Explorer");
}

#[test]
fn budget_status_sums_usage_per_period_and_provider() {
    let connection = test_database();
    connection
        .execute(
            "INSERT INTO providers (id, name, kind, model, status, created_at, updated_at)
             VALUES ('provider-1', 'Lab', 'openai', 'gpt-test', 'disabled', 0, 0)",
            [],
        )
        .expect("provider must be created");

    let now = crate::db::now_unix();
    let day_start = now.div_euclid(86_400) * 86_400;
    let mut settings = get_settings(&connection).expect("settings must load");
    settings.budgets = vec![
        BudgetSettings {
            id: "global-day".into(),
            provider_id: None,
            period: "day".into(),
            token_limit: 1_000,
            request_limit: 5,
        },
        BudgetSettings {
            id: "provider-month".into(),
            provider_id: Some("provider-1".into()),
            period: "month".into(),
            token_limit: 10_000,
            request_limit: 0,
        },
    ];
    update_settings(&connection, &settings).expect("settings must save");

    // Inside the current day/month for provider-1.
    for (id, input, output, requests, provider) in [
        ("u1", 100_i64, 50_i64, 1_i64, Some("provider-1")),
        ("u2", 200, 30, 1, Some("provider-1")),
        ("u3", 400, 10, 2, None),
        // Outside the current day but inside the current month.
        ("old", 5_000, 500, 1, Some("provider-1")),
    ] {
        let created = if id == "old" {
            day_start - 3 * 86_400 + 100
        } else {
            day_start + 100
        };
        connection
            .execute(
                "INSERT INTO usage_events
                        (id, provider_id, model, input_tokens, output_tokens, request_count, created_at)
                 VALUES (?1, ?2, 'model', ?3, ?4, ?5, ?6)",
                params![id, provider, input, output, requests, created],
            )
            .expect("usage event must be created");
    }

    let statuses = budget_status(&connection).expect("status must compute");
    assert_eq!(statuses.len(), 2);

    let global = statuses.iter().find(|s| s.rule_id == "global-day").unwrap();
    // Global day rule counts every event of the day: (150 + 230 + 410) tokens, 4 requests.
    assert_eq!(global.used_tokens, 790);
    assert_eq!(global.used_requests, 4);
    assert!(!global.exceeded);

    let per_provider = statuses
        .iter()
        .find(|s| s.rule_id == "provider-month")
        .unwrap();
    // Month rule for provider-1: (150 + 230 + 5500) tokens.
    assert_eq!(per_provider.used_tokens, 5_880);
    assert_eq!(per_provider.used_requests, 3);
    assert!(!per_provider.exceeded);

    // Crossing the request ceiling flips the flag.
    connection
        .execute(
            "INSERT INTO usage_events
                    (id, provider_id, model, input_tokens, output_tokens, request_count, created_at)
             VALUES ('u9', 'provider-1', 'model', 1, 1, 2, ?1)",
            params![day_start + 200],
        )
        .expect("usage event must be created");
    let statuses = budget_status(&connection).expect("status must compute");
    let global = statuses.iter().find(|s| s.rule_id == "global-day").unwrap();
    assert!(global.exceeded);
}

#[test]
fn budget_normalization_drops_incomplete_rules() {
    let connection = test_database();
    let mut settings = get_settings(&connection).expect("settings must load");
    settings.budgets = vec![
        BudgetSettings {
            id: "valid".into(),
            provider_id: None,
            period: "month".into(),
            token_limit: 100,
            request_limit: 0,
        },
        BudgetSettings {
            id: "no-limits".into(),
            provider_id: None,
            period: "day".into(),
            token_limit: 0,
            request_limit: 0,
        },
        BudgetSettings {
            id: String::new(),
            provider_id: None,
            period: "week".into(),
            token_limit: 10,
            request_limit: 10,
        },
    ];
    let normalized =
        crate::app_settings::normalize(settings, &HashSet::new()).expect("settings must normalize");
    assert_eq!(normalized.budgets.len(), 1);
    assert_eq!(normalized.budgets[0].id, "valid");
    assert_eq!(normalized.budgets[0].period, "month");
}

#[test]
fn snippet_normalization_trims_caps_and_dedupes() {
    let connection = test_database();
    let mut settings = get_settings(&connection).expect("settings must load");
    settings.snippets = vec![
        PromptSnippet {
            id: "s1".into(),
            title: "  Greeting  ".into(),
            content: "  Hello there  ".into(),
        },
        PromptSnippet {
            id: "s1".into(),
            title: "Duplicate".into(),
            content: "Dup".into(),
        },
        PromptSnippet {
            id: "s2".into(),
            title: String::new(),
            content: "No title".into(),
        },
        PromptSnippet {
            id: "s3".into(),
            title: "Empty content".into(),
            content: "   ".into(),
        },
        PromptSnippet {
            id: "s4".into(),
            title: "Too long".into(),
            content: "x".repeat(12_001),
        },
    ];
    let normalized =
        crate::app_settings::normalize(settings, &HashSet::new()).expect("settings must normalize");
    assert_eq!(normalized.snippets.len(), 1);
    assert_eq!(normalized.snippets[0].id, "s1");
    assert_eq!(normalized.snippets[0].title, "Greeting");
    assert_eq!(normalized.snippets[0].content, "Hello there");

    // The trimmed list round-trips through the database.
    update_settings(&connection, &normalized).expect("settings must save");
    let reloaded = get_settings(&connection).expect("settings must load");
    assert_eq!(reloaded.snippets.len(), 1);
    assert_eq!(reloaded.snippets[0].content, "Hello there");
}

#[test]
fn variant_feedback_surfaces_only_top_rated_variants_for_the_entity() {
    let connection = test_database();
    let character = GalaxyItemInput {
        id: None,
        kind: "character".into(),
        name: "Nova".into(),
        description: String::new(),
        data: serde_json::json!({}),
    };
    upsert_galaxy_item(&connection, "char-nova", &character).expect("character must exist");
    create_test_chat(&connection, "chat-1");
    connection
        .execute(
            "UPDATE chats SET character_id = 'char-nova' WHERE id = 'chat-1'",
            [],
        )
        .expect("chat must reference character");

    add_assistant_message(&connection, "chat-1", "msg-1", "Weak reply")
        .expect("message must be created");
    set_variant_feedback(&connection, "msg-1", 0, Some(2), None).expect("rating must save");

    add_assistant_message(&connection, "chat-1", "msg-2", "Great reply")
        .expect("message must be created");
    set_variant_feedback(&connection, "msg-2", 0, Some(5), Some("Perfect tone"))
        .expect("rating must save");

    let hints = list_variant_feedback(&connection, "char-nova").expect("hints must list");
    assert_eq!(hints.len(), 1);
    assert_eq!(hints[0].content, "Great reply");
    assert_eq!(hints[0].rating, Some(5));
    assert_eq!(hints[0].note.as_deref(), Some("Perfect tone"));
    assert_eq!(hints[0].chat_title, "Test chat");

    // Notes alone (without a high rating) also qualify.
    add_assistant_message(&connection, "chat-1", "msg-3", "Noted reply")
        .expect("message must be created");
    set_variant_feedback(&connection, "msg-3", 0, None, Some("Watch the pacing"))
        .expect("note must save");
    let hints = list_variant_feedback(&connection, "char-nova").expect("hints must list");
    assert_eq!(hints.len(), 2);

    // Persona/worldbook entities get no hints.
    upsert_galaxy_item(
        &connection,
        "persona-1",
        &GalaxyItemInput {
            id: None,
            kind: "persona".into(),
            name: "Explorer".into(),
            description: String::new(),
            data: serde_json::json!({}),
        },
    )
    .expect("persona must exist");
    assert!(list_variant_feedback(&connection, "persona-1")
        .expect("must list")
        .is_empty());
}
