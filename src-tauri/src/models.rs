use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub updated_at: String,
    pub message_count: i64,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GalaxyItem {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub description: String,
    pub badge: String,
    pub accent: String,
    pub updated_at: String,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub animations: bool,
    pub haptics: bool,
    pub compact_mode: bool,
    pub send_on_enter: bool,
    pub save_drafts: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            animations: true,
            haptics: true,
            compact_mode: false,
            send_on_enter: true,
            save_drafts: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsagePoint {
    pub label: String,
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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedChat {
    pub id: String,
    pub title: String,
}
