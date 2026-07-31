use super::{
    continuation_instruction, instruction, normalize_response, regeneration_instruction,
    regeneration_mode, RegenerationMode,
};

#[test]
fn trims_edges_without_rewriting_model_content() {
    assert_eq!(
        normalize_response("  *smiles* Hello 🙂\n\n\n**important**  "),
        "*smiles* Hello 🙂\n\n\n**important**"
    );
}

#[test]
fn continuation_instruction_uses_the_requested_language() {
    assert!(continuation_instruction(Some("ru")).starts_with("Продолжи"));
    assert!(continuation_instruction(Some("en")).starts_with("Continue"));
}

#[test]
fn continued_assistant_messages_regenerate_as_continuations() {
    assert_eq!(regeneration_mode(Some("user")), Some(RegenerationMode::Reply));
    assert_eq!(
        regeneration_mode(Some("assistant")),
        Some(RegenerationMode::Continuation),
    );
    assert_eq!(regeneration_mode(Some("system")), None);
    assert!(regeneration_instruction(RegenerationMode::Reply, Some("ru")).is_none());
    assert!(regeneration_instruction(RegenerationMode::Continuation, Some("ru"))
        .expect("continuation instruction must exist")
        .starts_with("Продолжи"));
}

#[test]
fn casual_brief_rule_sets_short_human_defaults() {
    let value = instruction("casual-brief").expect("preset must exist");
    assert!(value.contains("1–3 short sentences"));
    assert!(value.contains("long compound sentences"));
    assert!(value.contains("expand only"));
}
