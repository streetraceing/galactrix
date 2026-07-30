use super::{continuation_instruction, merge_continuation, normalize_response};

#[test]
fn trims_edges_without_rewriting_model_content() {
    assert_eq!(
        normalize_response("  *smiles* Hello 🙂\n\n\n**important**  "),
        "*smiles* Hello 🙂\n\n\n**important**"
    );
}

#[test]
fn continuation_joins_incomplete_sentence_with_a_space() {
    assert_eq!(
        merge_continuation("The answer continues", "from this point."),
        "The answer continues from this point."
    );
}

#[test]
fn continuation_starts_a_new_paragraph_after_a_complete_thought() {
    assert_eq!(
        merge_continuation("First paragraph.", "Second paragraph."),
        "First paragraph.\n\nSecond paragraph."
    );
}

#[test]
fn continuation_does_not_insert_space_before_punctuation() {
    assert_eq!(merge_continuation("Wait", ", please."), "Wait, please.");
}

#[test]
fn continuation_instruction_uses_the_requested_language() {
    assert!(continuation_instruction(Some("ru")).starts_with("Продолжи"));
    assert!(continuation_instruction(Some("en")).starts_with("Continue"));
}
