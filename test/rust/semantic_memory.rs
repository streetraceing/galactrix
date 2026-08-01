use super::*;

fn message(id: &str, role: &str, content: &str, remembered: bool) -> Message {
    Message {
        id: id.into(),
        chat_id: "chat-1".into(),
        role: role.into(),
        content: content.into(),
        created_at: 0,
        remembered,
        active_variant_index: 0,
        variants: Vec::new(),
    }
}

#[test]
fn candidates_combine_remembered_archived_and_structured_context() {
    let history = vec![
        message("m-1", "user", "My favorite editor is VS Code", true),
        message("m-2", "assistant", "We chose SQLite", false),
        message("m-3", "user", "Current request", false),
    ];
    let context = DynamicContextState {
        summary: "The user is building Galactrix".into(),
        facts: vec!["Uses Rust".into()],
        covered_through_message_id: Some("m-2".into()),
        ..DynamicContextState::default()
    };
    let settings = SemanticMemorySettings::default();

    let candidates = build_candidates(&history, Some(&context), &settings);
    assert!(candidates.iter().any(|item| item.source_kind == "remembered-message"));
    assert!(candidates.iter().any(|item| item.source_kind == "archived-message"));
    assert!(candidates.iter().any(|item| item.source_kind == "context-summary"));
    assert!(candidates.iter().any(|item| item.content == "Uses Rust"));
}

#[test]
fn cosine_retrieval_orders_relevant_memory_first() {
    let mut records = vec![
        SemanticMemoryRecord {
            source_kind: "fact".into(), source_id: "one".into(), content: "Rust".into(),
            embedding: vec![1.0, 0.0], similarity: 0.0,
        },
        SemanticMemoryRecord {
            source_kind: "fact".into(), source_id: "two".into(), content: "Design".into(),
            embedding: vec![0.0, 1.0], similarity: 0.0,
        },
    ];

    let selected = select_relevant(&mut records, &[0.95, 0.05], 1, 0.2);
    assert_eq!(selected.len(), 1);
    assert_eq!(selected[0].content, "Rust");
    assert!(selected[0].similarity > 0.9);
}

#[test]
fn incompatible_vectors_are_never_considered_relevant() {
    assert_eq!(cosine_similarity(&[1.0], &[1.0, 0.0]), -1.0);
    assert_eq!(cosine_similarity(&[0.0, 0.0], &[1.0, 0.0]), -1.0);
}

#[test]
fn context_source_ids_are_deterministic() {
    assert_eq!(stable_id("context-fact", "Likes Rust"), "ccc783ae5165dba1");
}
