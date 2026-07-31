use super::*;

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
fn user_message_is_durable_before_assistant_response() {
    let connection = test_database();
    create_test_chat(&connection, "chat-1");

    add_user_message(&connection, "chat-1", "user-1", "hello")
        .expect("user message must persist");

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
    add_user_message(&connection, "chat-1", "user-1", "hello")
        .expect("user message must persist");
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
    add_user_message(&connection, "chat-1", "user-1", "hello")
        .expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "hi")
        .expect("assistant message must persist");
    append_message_variant(
        &connection,
        "assistant-1",
        "assistant-1-variant-1",
        "hello again",
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
    add_user_message(&connection, "chat-1", "user-1", "hello")
        .expect("user message must persist");
    add_assistant_message(&connection, "chat-1", "assistant-1", "first answer")
        .expect("assistant message must persist");
    append_message_variant(
        &connection,
        "assistant-1",
        "assistant-1-variant-1",
        "selected answer",
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
    add_user_message(&connection, "chat-1", "user-1", "hello")
        .expect("user message must persist");

    let error = messages_through_message(&connection, "user-1")
        .expect_err("user messages cannot be continued");
    assert_eq!(error.key, keys::MESSAGE_CONTINUE_ASSISTANT_ONLY);
}
