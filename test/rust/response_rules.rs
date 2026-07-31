use super::{continuation_instruction, normalize_response};

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
