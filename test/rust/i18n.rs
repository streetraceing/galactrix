use super::{keys, CommandError};

#[test]
fn serializes_translation_key_and_variables() {
    let error = CommandError::new(keys::PROVIDER_UNKNOWN_KIND).with_variable("kind", "example");
    let value = serde_json::to_value(error).expect("command error must serialize");
    assert_eq!(value["key"], keys::PROVIDER_UNKNOWN_KIND);
    assert_eq!(value["variables"]["kind"], "example");
}
