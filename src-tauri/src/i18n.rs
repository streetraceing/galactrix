use std::{collections::HashMap, fmt::Display};

use serde::Serialize;

pub mod keys {
    pub const INTERNAL: &str = "backend.internal";

    pub const CHAT_TITLE_REQUIRED: &str = "backend.chat.titleRequired";
    pub const CHAT_TITLE_TOO_LONG: &str = "backend.chat.titleTooLong";
    pub const CHAT_GREETING_TOO_LONG: &str = "backend.chat.greetingTooLong";
    pub const CHAT_RECENT_MESSAGE_LIMIT_RANGE: &str = "backend.chat.recentMessageLimitRange";
    pub const CHAT_NOT_FOUND: &str = "backend.chat.notFound";
    pub const CHAT_ARCHIVED_READ_ONLY: &str = "backend.chat.archivedReadOnly";

    pub const MESSAGE_NOT_FOUND: &str = "backend.message.notFound";
    pub const MESSAGE_EMPTY: &str = "backend.message.empty";
    pub const MESSAGE_USER_BEFORE_ASSISTANT_MISSING: &str =
        "backend.message.userBeforeAssistantMissing";
    pub const MESSAGE_REGENERATE_ASSISTANT_ONLY: &str = "backend.message.regenerateAssistantOnly";
    pub const MESSAGE_CONTINUE_ASSISTANT_ONLY: &str = "backend.message.continueAssistantOnly";
    pub const MESSAGE_VARIANTS_ASSISTANT_ONLY: &str = "backend.message.variantsAssistantOnly";
    pub const MESSAGE_VARIANT_NOT_FOUND: &str = "backend.message.variantNotFound";

    pub const PROVIDER_EMPTY_RESPONSE: &str = "backend.provider.emptyResponse";
    pub const PROVIDER_SELECT_FOR_CHAT: &str = "backend.provider.selectForChat";
    pub const PROVIDER_NOT_FOUND: &str = "backend.provider.notFound";
    pub const PROVIDER_NAME_REQUIRED: &str = "backend.provider.nameRequired";
    pub const PROVIDER_MODEL_REQUIRED: &str = "backend.provider.modelRequired";
    pub const PROVIDER_EMBEDDING_MODEL_REQUIRED: &str = "backend.provider.embeddingModelRequired";
    pub const PROVIDER_EMBEDDING_MODEL_TOO_LONG: &str = "backend.provider.embeddingModelTooLong";
    pub const PROVIDER_BASE_URL_TOO_LONG: &str = "backend.provider.baseUrlTooLong";
    pub const PROVIDER_API_KEY_REQUIRED: &str = "backend.provider.apiKeyRequired";
    pub const PROVIDER_API_KEY_MISSING: &str = "backend.provider.apiKeyMissing";
    pub const PROVIDER_API_KEY_NOT_IN_STORAGE: &str = "backend.provider.apiKeyNotInStorage";
    pub const PROVIDER_UNKNOWN_KIND: &str = "backend.provider.unknownKind";
    pub const PROVIDER_NOT_OPENAI_COMPATIBLE: &str = "backend.provider.notOpenAiCompatible";
    pub const PROVIDER_TEMPERATURE_RANGE: &str = "backend.provider.temperatureRange";
    pub const PROVIDER_TOP_P_RANGE: &str = "backend.provider.topPRange";
    pub const PROVIDER_MAX_TOKENS_POSITIVE: &str = "backend.provider.maxTokensPositive";
    pub const PROVIDER_CHARACTER_AI_UNSUPPORTED: &str = "backend.provider.characterAiUnsupported";
    pub const PROVIDER_CONNECTION_FAILED: &str = "backend.provider.connectionFailed";
    pub const PROVIDER_REQUEST_FAILED: &str = "backend.provider.requestFailed";
    pub const PROVIDER_REQUEST_CANCELLED: &str = "backend.provider.requestCancelled";
    pub const PROVIDER_RESPONSE_READ_FAILED: &str = "backend.provider.responseReadFailed";
    pub const PROVIDER_HTTP_ERROR: &str = "backend.provider.httpError";
    pub const PROVIDER_BASE_URL_REQUIRED: &str = "backend.provider.baseUrlRequired";
    pub const PROVIDER_ACCOUNT_ID_REQUIRED: &str = "backend.provider.accountIdRequired";

    pub const COMMON_NAME_REQUIRED: &str = "backend.common.nameRequired";
    pub const COMMON_NAME_TOO_LONG: &str = "backend.common.nameTooLong";

    pub const GALAXY_NOT_FOUND: &str = "backend.galaxy.notFound";
    pub const GALAXY_CONTEXT_PERSONA_NOT_FOUND: &str = "backend.galaxy.contextPersonaNotFound";
    pub const GALAXY_CONTEXT_CHARACTER_NOT_FOUND: &str = "backend.galaxy.contextCharacterNotFound";
    pub const GALAXY_CONTEXT_UNIVERSE_NOT_FOUND: &str = "backend.galaxy.contextUniverseNotFound";
    pub const GALAXY_CONTEXT_WORLDBOOK_NOT_FOUND: &str = "backend.galaxy.contextWorldbookNotFound";
    pub const GALAXY_CONTEXT_STYLE_NOT_FOUND: &str = "backend.galaxy.contextStyleNotFound";
    pub const GALAXY_CONTEXT_PROMPT_SET_NOT_FOUND: &str = "backend.galaxy.contextPromptSetNotFound";
    pub const GALAXY_CONTEXT_OBJECT_NOT_FOUND: &str = "backend.galaxy.contextObjectNotFound";
    pub const GALAXY_DATA_MUST_BE_OBJECT: &str = "backend.galaxy.dataMustBeObject";
    pub const GALAXY_KIND_IMMUTABLE: &str = "backend.galaxy.kindImmutable";
    pub const GALAXY_DATA_TOO_LARGE: &str = "backend.galaxy.dataTooLarge";
    pub const GALAXY_STYLE_PRESET_UNKNOWN: &str = "backend.galaxy.stylePresetUnknown";
    pub const GALAXY_SAVED_STYLE_REQUIRED: &str = "backend.galaxy.savedStyleRequired";
    pub const GALAXY_PROMPT_SET_REFERENCE_INVALID: &str =
        "backend.galaxy.promptSetReferenceInvalid";
    pub const GALAXY_KIND_UNKNOWN: &str = "backend.galaxy.kindUnknown";

    pub const PROMPT_SET_INVALID: &str = "backend.promptSet.invalid";
    pub const PROMPT_SET_NESTED_NOT_ALLOWED: &str = "backend.promptSet.nestedNotAllowed";
    pub const PROMPT_SET_LIMIT: &str = "backend.promptSet.limit";
    pub const PROMPT_SET_DUPLICATE: &str = "backend.promptSet.duplicate";

    pub const PROMPT_RULE_UNKNOWN: &str = "backend.prompt.ruleUnknown";
    pub const PROMPT_RULE_DUPLICATE: &str = "backend.prompt.ruleDuplicate";
    pub const PROMPT_PRIORITY_UNKNOWN: &str = "backend.prompt.priorityUnknown";
    pub const PROMPT_BLOCK_LIMIT: &str = "backend.prompt.blockLimit";
    pub const PROMPT_BLOCK_ID_DUPLICATE: &str = "backend.prompt.blockIdDuplicate";
    pub const PROMPT_BLOCK_TITLE_TOO_LONG: &str = "backend.prompt.blockTitleTooLong";
    pub const PROMPT_BLOCK_TITLE_REQUIRED: &str = "backend.prompt.blockTitleRequired";
    pub const PROMPT_BLOCK_PRIORITY_UNKNOWN: &str = "backend.prompt.blockPriorityUnknown";
    pub const PROMPT_BLOCK_CONTENT_REQUIRED: &str = "backend.prompt.blockContentRequired";
    pub const PROMPT_BLOCK_TOO_LONG: &str = "backend.prompt.blockTooLong";
    pub const PROMPT_BLOCKS_TOO_LARGE: &str = "backend.prompt.blocksTooLarge";

    pub const PROFILE_NAME_TOO_LONG: &str = "backend.profile.nameTooLong";
    pub const PROFILE_IMAGE_UNSUPPORTED: &str = "backend.profile.imageUnsupported";
    pub const PROFILE_IMAGE_TOO_LARGE: &str = "backend.profile.imageTooLarge";

    pub const SECURE_STORAGE_UNAVAILABLE: &str = "backend.secureStorage.unavailable";
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub key: String,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub variables: HashMap<String, String>,
}

pub type CommandResult<T> = Result<T, CommandError>;

impl CommandError {
    pub fn new(key: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            variables: HashMap::new(),
        }
    }

    pub fn with_variable(mut self, name: impl Into<String>, value: impl ToString) -> Self {
        self.variables.insert(name.into(), value.to_string());
        self
    }

    pub fn with_detail(key: impl Into<String>, detail: impl Display) -> Self {
        Self::new(key).with_variable("detail", detail)
    }

    pub fn internal(detail: impl Display) -> Self {
        Self::with_detail(keys::INTERNAL, detail)
    }
}

impl Display for CommandError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.variables.is_empty() {
            return formatter.write_str(&self.key);
        }
        write!(formatter, "{} {:?}", self.key, self.variables)
    }
}

impl std::error::Error for CommandError {}

impl From<rusqlite::Error> for CommandError {
    fn from(error: rusqlite::Error) -> Self {
        Self::internal(error)
    }
}

impl From<serde_json::Error> for CommandError {
    fn from(error: serde_json::Error) -> Self {
        Self::internal(error)
    }
}

impl From<std::io::Error> for CommandError {
    fn from(error: std::io::Error) -> Self {
        Self::internal(error)
    }
}

#[cfg(test)]
#[path = "../../test/rust/i18n.rs"]
mod tests;
