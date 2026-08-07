use super::{
    continuation_instruction, instruction, normalize_response, normalize_response_with_cleanup,
    regeneration_instruction,
    regeneration_mode, RegenerationMode,
};
use crate::models::ResponseCleanupSettings;

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
    assert_eq!(
        regeneration_mode(Some("user")),
        Some(RegenerationMode::Reply)
    );
    assert_eq!(
        regeneration_mode(Some("assistant")),
        Some(RegenerationMode::Continuation),
    );
    assert_eq!(regeneration_mode(Some("system")), None);
    assert!(regeneration_instruction(RegenerationMode::Reply, Some("ru")).is_none());
    assert!(
        regeneration_instruction(RegenerationMode::Continuation, Some("ru"))
            .expect("continuation instruction must exist")
            .starts_with("Продолжи")
    );
}

#[test]
fn casual_brief_rule_sets_short_human_defaults() {
    let value = instruction("casual-brief").expect("preset must exist");
    assert!(value.contains("1–3 short sentences"));
    assert!(value.contains("long compound sentences"));
    assert!(value.contains("expand only"));
}

#[test]
fn lowercase_rules_include_relaxed_and_strict_modes() {
    let relaxed = instruction("casual-lowercase").expect("relaxed lowercase rule must exist");
    assert!(relaxed.contains("lowercase letters"));
    assert!(relaxed.contains("personal names"));

    let strict = instruction("strict-lowercase").expect("strict lowercase rule must exist");
    assert!(strict.contains("strict output constraint"));
    assert!(strict.contains("прост проверял связь, что делаешь?"));
    assert!(strict.contains("Never ignore this rule"));
}

#[test]
fn response_cleanup_is_conservative_and_optional() {
    let settings = ResponseCleanupSettings {
        enabled: true,
        collapse_blank_lines: true,
        remove_duplicated_tail: true,
    };
    let repeated = "First paragraph.\n\n\n\nThis final paragraph is long enough to deduplicate.\n\nThis final paragraph is long enough to deduplicate.";
    assert_eq!(
        normalize_response_with_cleanup(repeated, &settings),
        "First paragraph.\n\nThis final paragraph is long enough to deduplicate."
    );

    let disabled = ResponseCleanupSettings {
        enabled: false,
        ..settings
    };
    assert_eq!(
        normalize_response_with_cleanup("  one\n\n\n\ntwo  ", &disabled),
        "one\n\n\n\ntwo"
    );
}
