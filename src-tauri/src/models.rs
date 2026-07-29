use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub updated_at: String,
    pub message_count: i64,
    pub pinned: bool,
    pub provider_id: Option<String>,
    pub persona_id: Option<String>,
    pub character_id: Option<String>,
    pub universe_id: Option<String>,
    pub worldbook_ids: Vec<String>,
    pub prompt_config: PromptConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptBlock {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(default = "default_prompt_priority")]
    pub priority: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptContextPriorities {
    #[serde(default = "default_normal_priority")]
    pub persona: String,
    #[serde(default = "default_critical_priority")]
    pub character: String,
    #[serde(default = "default_high_priority")]
    pub universe: String,
    #[serde(default = "default_normal_priority")]
    pub worldbooks: String,
    #[serde(default = "default_high_priority")]
    pub remembered: String,
    #[serde(default = "default_high_priority")]
    pub presets: String,
}

impl Default for PromptContextPriorities {
    fn default() -> Self {
        Self {
            persona: default_normal_priority(),
            character: default_critical_priority(),
            universe: default_high_priority(),
            worldbooks: default_normal_priority(),
            remembered: default_high_priority(),
            presets: default_high_priority(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PromptConfig {
    #[serde(default)]
    pub set_ids: Vec<String>,
    #[serde(default)]
    pub preset_ids: Vec<String>,
    #[serde(default)]
    pub context_priorities: PromptContextPriorities,
    #[serde(default)]
    pub custom_blocks: Vec<PromptBlock>,
}

impl PromptConfig {
    pub fn from_legacy(preset: &str) -> Self {
        let preset_ids = match preset {
            "human" => vec!["human"],
            "dialogue-only" => vec!["dialogue-only"],
            "no-emoji" => vec!["no-emoji"],
            "first-person" => vec!["first-person"],
            "clean-human" => vec!["human", "first-person", "no-emoji", "dialogue-only"],
            _ => Vec::new(),
        }
        .into_iter()
        .map(str::to_owned)
        .collect();

        Self {
            preset_ids,
            ..Self::default()
        }
    }
}

fn default_true() -> bool {
    true
}

fn default_prompt_priority() -> String {
    default_normal_priority()
}

fn default_normal_priority() -> String {
    "normal".into()
}

fn default_high_priority() -> String {
    "high".into()
}

fn default_critical_priority() -> String {
    "critical".into()
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConfigInput {
    pub title: String,
    pub provider_id: Option<String>,
    pub persona_id: Option<String>,
    pub character_id: Option<String>,
    pub universe_id: Option<String>,
    #[serde(default)]
    pub worldbook_ids: Vec<String>,
    #[serde(default)]
    pub prompt_config: PromptConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageVariant {
    pub id: String,
    pub index: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    pub remembered: bool,
    pub active_variant_index: i64,
    pub variants: Vec<MessageVariant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GalaxyItem {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub description: String,
    pub data: Value,
    pub badge: String,
    pub accent: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GalaxyItemInput {
    pub id: Option<String>,
    pub kind: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub data: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub model: String,
    pub status: String,
    pub base_url: Option<String>,
    pub account_id: Option<String>,
    pub latency_ms: Option<i64>,
    pub temperature: f64,
    pub top_p: f64,
    pub max_tokens: i64,
    pub has_secret: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInput {
    pub id: Option<String>,
    pub name: String,
    pub kind: String,
    pub model: String,
    pub base_url: Option<String>,
    pub account_id: Option<String>,
    pub temperature: f64,
    pub top_p: f64,
    pub max_tokens: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderImportInput {
    pub provider: ProviderInput,
    pub api_key: Option<String>,
}

impl ProviderInput {
    pub fn into_provider(self, id: String, status: String, latency_ms: Option<i64>) -> Provider {
        Provider {
            id,
            name: self.name,
            kind: self.kind,
            model: self.model,
            status,
            base_url: self.base_url,
            account_id: self.account_id,
            latency_ms,
            temperature: self.temperature,
            top_p: self.top_p,
            max_tokens: self.max_tokens,
            has_secret: false,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModelResult {
    pub models: Vec<String>,
    pub latency_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub profile_name: String,
    pub profile_avatar: Option<String>,
    pub animations: bool,
    pub haptics: bool,
    pub compact_mode: bool,
    pub send_on_enter: bool,
    pub save_drafts: bool,
    pub interface_scale: f64,
    pub sidebar_width: i64,
    pub chat_sidebar_width: i64,
    pub sidebar_collapsed: bool,
    pub theme_mode: String,
    pub theme_variant: String,
    pub language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            profile_name: "Вы".into(),
            profile_avatar: None,
            animations: true,
            haptics: true,
            compact_mode: false,
            send_on_enter: true,
            save_drafts: true,
            interface_scale: 1.0,
            sidebar_width: 248,
            chat_sidebar_width: 320,
            sidebar_collapsed: false,
            theme_mode: "system".into(),
            theme_variant: "default".into(),
            language: "system".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsagePoint {
    pub day: i64,
    pub label: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub tokens: i64,
    pub requests: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSnapshot {
    pub chats: Vec<Chat>,
    pub messages: Vec<Message>,
    pub galaxy_items: Vec<GalaxyItem>,
    pub providers: Vec<Provider>,
    pub settings: AppSettings,
    pub usage: Vec<UsagePoint>,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedChat {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone)]
pub struct ChatPromptContext {
    pub persona: Option<GalaxyItem>,
    pub character: Option<GalaxyItem>,
    pub universe: Option<GalaxyItem>,
    pub worldbooks: Vec<GalaxyItem>,
    pub character_style: Option<GalaxyItem>,
    pub prompt_sets: Vec<GalaxyItem>,
    pub prompt_config: PromptConfig,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptPreviewInput {
    pub persona: Option<GalaxyItemInput>,
    pub character: Option<GalaxyItemInput>,
    pub universe: Option<GalaxyItemInput>,
    #[serde(default)]
    pub worldbooks: Vec<GalaxyItemInput>,
    pub character_style: Option<GalaxyItemInput>,
    #[serde(default)]
    pub prompt_sets: Vec<GalaxyItemInput>,
    #[serde(default)]
    pub prompt_config: PromptConfig,
    #[serde(default)]
    pub remembered_messages: Vec<Message>,
    pub user_name: Option<String>,
    pub character_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptPreviewResult {
    pub prompt: String,
    pub approximate_tokens: i64,
    pub characters: i64,
}

#[derive(Debug, Clone)]
pub struct CompletionResult {
    pub content: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub latency_ms: i64,
}
