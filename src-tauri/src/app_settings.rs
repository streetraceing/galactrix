use std::collections::HashSet;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{AppSettings, DynamicContextSettings};

const THEMES: &[&str] = &[
    "default",
    "lavender",
    "discord",
    "spotify",
    "mint",
    "uber",
    "rabbit",
    "catppuccin",
    "tokyo-night",
    "nord",
    "dracula",
    "rose-pine",
    "gruvbox",
    "solarized",
    "monochrome",
];

pub(crate) fn normalize(
    mut settings: AppSettings,
    provider_ids: &HashSet<String>,
) -> CommandResult<AppSettings> {
    settings.profile_name = settings.profile_name.trim().to_string();
    if settings.profile_name.chars().count() > 80 {
        return Err(CommandError::new(keys::PROFILE_NAME_TOO_LONG));
    }

    settings.profile_avatar = settings.profile_avatar.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });
    if let Some(avatar) = settings.profile_avatar.as_deref() {
        if !avatar.starts_with("data:image/") {
            return Err(CommandError::new(keys::PROFILE_IMAGE_UNSUPPORTED));
        }
        if avatar.len() > 900_000 {
            return Err(CommandError::new(keys::PROFILE_IMAGE_TOO_LARGE));
        }
    }

    settings.interface_scale = settings.interface_scale.clamp(0.8, 1.5);
    settings.sidebar_width = settings.sidebar_width.clamp(196, 420);
    settings.chat_sidebar_width = settings.chat_sidebar_width.clamp(248, 560);
    if !matches!(settings.theme_mode.as_str(), "light" | "dark" | "system") {
        settings.theme_mode = "system".into();
    }
    if !THEMES.contains(&settings.theme_variant.as_str()) {
        settings.theme_variant = "default".into();
    }
    if !matches!(settings.language.as_str(), "system" | "ru" | "en") {
        settings.language = "system".into();
    }
    if !matches!(
        settings.chat_view_mode.as_str(),
        "conversation" | "messenger"
    ) {
        settings.chat_view_mode = "conversation".into();
    }
    if !matches!(settings.response_language.as_str(), "app" | "auto") {
        settings.response_language = "app".into();
    }

    normalize_ai_settings(&mut settings, provider_ids);
    Ok(settings)
}

fn normalize_ai_settings(settings: &mut AppSettings, provider_ids: &HashSet<String>) {
    settings.ai_modules.retry.max_attempts = settings.ai_modules.retry.max_attempts.clamp(1, 8);
    settings.ai_modules.retry.initial_delay_ms = settings
        .ai_modules
        .retry
        .initial_delay_ms
        .clamp(100, 60_000);
    settings.ai_modules.retry.max_delay_ms = settings
        .ai_modules
        .retry
        .max_delay_ms
        .clamp(settings.ai_modules.retry.initial_delay_ms, 300_000);

    let dynamic = &mut settings.ai_modules.dynamic_context;
    if !matches!(dynamic.mode.as_str(), "local" | "provider" | "hybrid") {
        dynamic.mode = "hybrid".into();
    }
    dynamic.provider_id = valid_provider_id(dynamic.provider_id.take(), provider_ids);
    dynamic.direct_message_limit = dynamic.direct_message_limit.clamp(8, 200);
    dynamic.summary_batch_size = dynamic.summary_batch_size.clamp(4, 100);
    dynamic.trigger_messages = dynamic
        .trigger_messages
        .clamp(dynamic.direct_message_limit.saturating_add(4), 500);
    dynamic.analysis_prompt = dynamic
        .analysis_prompt
        .trim()
        .chars()
        .take(12_000)
        .collect();
    if dynamic.analysis_prompt.is_empty() {
        dynamic.analysis_prompt = DynamicContextSettings::default().analysis_prompt;
    }

    let semantic = &mut settings.ai_modules.semantic_memory;
    semantic.provider_id = valid_provider_id(semantic.provider_id.take(), provider_ids);
    semantic.top_k = semantic.top_k.clamp(1, 32);
    semantic.similarity_threshold = semantic.similarity_threshold.clamp(0.0, 1.0);
    semantic.batch_size = semantic.batch_size.clamp(1, 64);
    semantic.archived_message_limit = semantic.archived_message_limit.clamp(20, 5_000);

    let budget = &mut settings.ai_modules.context_budget;
    budget.max_characters = budget.max_characters.clamp(4_000, 500_000);
    budget.preserve_recent_messages = budget.preserve_recent_messages.clamp(2, 100);

    let repetition = &mut settings.ai_modules.repetition_guard;
    repetition.recent_assistant_messages = repetition.recent_assistant_messages.clamp(1, 12);
    repetition.max_characters_per_message =
        repetition.max_characters_per_message.clamp(120, 4_000);
}

fn valid_provider_id(
    provider_id: Option<String>,
    provider_ids: &HashSet<String>,
) -> Option<String> {
    provider_id.and_then(|value| {
        let value = value.trim();
        (!value.is_empty() && provider_ids.contains(value)).then(|| value.to_owned())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_choices_and_numeric_ranges_are_normalized() {
        let mut settings = AppSettings {
            theme_mode: "unknown".into(),
            theme_variant: "unknown".into(),
            language: "unknown".into(),
            interface_scale: 9.0,
            ..AppSettings::default()
        };
        settings.ai_modules.retry.max_attempts = 99;
        settings.ai_modules.context_budget.max_characters = 1;
        settings.ai_modules.context_budget.preserve_recent_messages = 999;
        settings.ai_modules.repetition_guard.recent_assistant_messages = 99;
        settings.ai_modules.repetition_guard.max_characters_per_message = 1;

        let normalized = normalize(settings, &HashSet::new()).expect("normalize settings");

        assert_eq!(normalized.theme_mode, "system");
        assert_eq!(normalized.theme_variant, "default");
        assert_eq!(normalized.language, "system");
        assert_eq!(normalized.interface_scale, 1.5);
        assert_eq!(normalized.ai_modules.retry.max_attempts, 8);
        assert_eq!(normalized.ai_modules.context_budget.max_characters, 4_000);
        assert_eq!(
            normalized.ai_modules.context_budget.preserve_recent_messages,
            100
        );
        assert_eq!(
            normalized.ai_modules.repetition_guard.recent_assistant_messages,
            12
        );
        assert_eq!(
            normalized.ai_modules.repetition_guard.max_characters_per_message,
            120
        );
    }

    #[test]
    fn only_existing_provider_references_survive_normalization() {
        let mut settings = AppSettings::default();
        settings.ai_modules.dynamic_context.provider_id = Some(" existing ".into());
        settings.ai_modules.semantic_memory.provider_id = Some("missing".into());
        let providers = HashSet::from(["existing".to_owned()]);

        let normalized = normalize(settings, &providers).expect("normalize settings");

        assert_eq!(
            normalized.ai_modules.dynamic_context.provider_id.as_deref(),
            Some("existing")
        );
        assert_eq!(normalized.ai_modules.semantic_memory.provider_id, None);
    }

    #[test]
    fn profile_avatar_must_be_an_inline_image() {
        let settings = AppSettings {
            profile_avatar: Some("https://example.com/avatar.png".into()),
            ..AppSettings::default()
        };

        let error = normalize(settings, &HashSet::new()).expect_err("reject remote avatar");

        assert_eq!(error.key, keys::PROFILE_IMAGE_UNSUPPORTED);
    }
}
