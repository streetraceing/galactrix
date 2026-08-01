use super::*;

fn message(id: &str, role: &str, content: &str) -> Message {
    Message {
        id: id.into(),
        chat_id: "chat-1".into(),
        role: role.into(),
        content: content.into(),
        created_at: 0,
        updated_at: 0,
        edited: false,
        remembered: false,
        active_variant_index: 0,
        variants: Vec::new(),
    }
}

#[test]
fn pending_batch_keeps_the_recent_direct_window_out_of_the_summary() {
    let history = (0..12)
        .map(|index| message(&format!("m-{index}"), if index % 2 == 0 { "user" } else { "assistant" }, "text"))
        .collect::<Vec<_>>();
    let settings = DynamicContextSettings {
        enabled: true,
        trigger_messages: 8,
        direct_message_limit: 4,
        summary_batch_size: 3,
        ..DynamicContextSettings::default()
    };

    let batch = pending_batch(&history, None, &settings);
    assert_eq!(batch.len(), 3);
    assert_eq!(batch.first().unwrap().id, "m-0");
    assert_eq!(batch.last().unwrap().id, "m-2");
}

#[test]
fn an_existing_summary_waits_for_a_new_unsummarized_trigger_window() {
    let history = (0..14)
        .map(|index| message(&format!("m-{index}"), if index % 2 == 0 { "user" } else { "assistant" }, "text"))
        .collect::<Vec<_>>();
    let context = DynamicContextState {
        covered_through_message_id: Some("m-7".into()),
        ..DynamicContextState::default()
    };
    let settings = DynamicContextSettings {
        enabled: true,
        trigger_messages: 8,
        direct_message_limit: 4,
        summary_batch_size: 3,
        ..DynamicContextSettings::default()
    };

    assert!(pending_batch(&history, Some(&context), &settings).is_empty());
}

#[test]
fn trimming_never_removes_messages_not_covered_by_context() {
    let history = (0..8)
        .map(|index| message(&format!("m-{index}"), if index % 2 == 0 { "user" } else { "assistant" }, "text"))
        .collect::<Vec<_>>();
    let context = DynamicContextState {
        covered_through_message_id: Some("m-3".into()),
        ..DynamicContextState::default()
    };

    let trimmed = trim_history(&history, Some(&context), 2);
    assert_eq!(trimmed.first().unwrap().id, "m-4");
    assert_eq!(trimmed.last().unwrap().id, "m-7");
}

#[test]
fn analyzer_response_is_parsed_as_structured_context() {
    let parsed = parse_analysis_response(
        "```json\n{\"summary\":\"A concise summary\",\"facts\":[\"Likes Rust\"],\"events\":[],\"decisions\":[\"Use SQLite\"],\"openThreads\":[\"Finish tests\"]}\n```",
        Some("m-4".into()),
    )
    .expect("valid analyzer JSON must parse");

    assert_eq!(parsed.summary, "A concise summary");
    assert_eq!(parsed.facts, vec!["Likes Rust"]);
    assert_eq!(parsed.covered_through_message_id.as_deref(), Some("m-4"));
    assert!(render_context_section(&parsed).unwrap().contains("Finish tests"));
}

#[test]
fn local_summary_keeps_the_most_recent_dialogue_when_compacted() {
    let previous = DynamicContextState {
        summary: "old ".repeat(2_000),
        ..DynamicContextState::default()
    };
    let latest = message("latest", "user", "LATEST IMPORTANT DETAIL");
    let state = local_analysis(Some(&previous), &[latest]);

    assert!(state.summary.starts_with('…'));
    assert!(state.summary.contains("LATEST IMPORTANT DETAIL"));
    assert!(state.summary.chars().count() <= 5_500);
}
