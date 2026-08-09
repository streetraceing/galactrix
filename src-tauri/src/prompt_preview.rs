use uuid::Uuid;

use crate::generation_modules;
use crate::models::{
    ChatPromptContext, GalaxyItem, GalaxyItemInput, Message, PromptPreviewInput,
    PromptPreviewResult, RepetitionGuardSettings,
};
use crate::prompt_builder::{self, PromptBuildOptions};

pub(crate) fn build(input: PromptPreviewInput) -> PromptPreviewResult {
    let scope = input.scope.as_deref().unwrap_or("request");
    let user_name =
        preview_user_name(input.persona.as_ref(), input.user_name.as_deref()).to_owned();
    let character_name = input
        .character_name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .or_else(|| {
            input
                .character
                .as_ref()
                .map(|item| item.name.trim())
                .filter(|name| !name.is_empty())
        })
        .unwrap_or("Assistant")
        .to_owned();
    let context = ChatPromptContext {
        persona: input.persona.map(preview_galaxy_item),
        character: input.character.map(preview_galaxy_item),
        universe: input.universe.map(preview_galaxy_item),
        worldbooks: input
            .worldbooks
            .into_iter()
            .map(preview_galaxy_item)
            .collect(),
        character_style: input.character_style.map(preview_galaxy_item),
        prompt_sets: input
            .prompt_sets
            .into_iter()
            .map(preview_galaxy_item)
            .collect(),
        prompt_config: input.prompt_config,
    };

    if scope == "contribution" {
        let prompt =
            prompt_builder::build_contribution_prompt(&context, &input.remembered_messages)
                .unwrap_or_default()
                .replace("{{user}}", &user_name)
                .replace("{{char}}", &character_name);
        let approximate_tokens = approximate_token_count(&prompt);
        return PromptPreviewResult {
            prompt: prompt.clone(),
            approximate_tokens,
            baseline_approximate_tokens: approximate_tokens,
            saved_approximate_tokens: 0,
            characters: prompt.chars().count() as i64,
            runtime_variable_sections: Vec::new(),
        };
    }

    let context_budget = input.context_budget.unwrap_or_default();
    let repetition_guard = input.repetition_guard.unwrap_or_default();
    let recent_history = apply_recent_message_limit(
        &input.conversation_messages,
        context.prompt_config.recent_message_limit,
    );
    let optimized_history =
        generation_modules::trim_history_for_budget(&recent_history, &context_budget);
    let optimized_remembered =
        archived_remembered_messages(&input.remembered_messages, &optimized_history);
    let baseline_remembered =
        archived_remembered_messages(&input.remembered_messages, &recent_history);

    let options = PromptBuildOptions::from_context_budget(&context_budget);
    let optimized_system = prompt_builder::build_system_prompt_with_histories(
        &context,
        &optimized_remembered,
        &input.conversation_messages,
        input.response_language.as_deref(),
        &options,
    )
    .map(|prompt| replace_names(prompt, &user_name, &character_name));
    let baseline_system = prompt_builder::build_system_prompt_with_histories(
        &context,
        &baseline_remembered,
        &input.conversation_messages,
        input.response_language.as_deref(),
        &PromptBuildOptions::default(),
    )
    .map(|prompt| replace_names(prompt, &user_name, &character_name));

    let optimized_system = append_repetition_guard(
        optimized_system,
        &input.conversation_messages,
        &optimized_history,
        &repetition_guard,
    );
    let baseline_system = append_repetition_guard(
        baseline_system,
        &input.conversation_messages,
        &recent_history,
        &repetition_guard,
    );

    let prompt = render_request(optimized_system.as_deref(), &optimized_history);
    let baseline_prompt = render_request(baseline_system.as_deref(), &recent_history);
    let approximate_tokens = approximate_token_count(&prompt);
    let baseline_approximate_tokens = approximate_token_count(&baseline_prompt);
    let saved_approximate_tokens = baseline_approximate_tokens.saturating_sub(approximate_tokens);
    let mut runtime_variable_sections = Vec::new();
    if input.dynamic_context_enabled {
        runtime_variable_sections.push("dynamicContext".to_owned());
    }
    if input.semantic_memory_enabled {
        runtime_variable_sections.push("semanticMemory".to_owned());
    }

    PromptPreviewResult {
        prompt: prompt.clone(),
        approximate_tokens,
        baseline_approximate_tokens,
        saved_approximate_tokens,
        characters: prompt.chars().count() as i64,
        runtime_variable_sections,
    }
}

fn preview_user_name<'a>(
    persona: Option<&'a GalaxyItemInput>,
    fallback: Option<&'a str>,
) -> &'a str {
    persona
        .map(|item| item.name.trim())
        .filter(|name| !name.is_empty())
        .or_else(|| fallback.map(str::trim).filter(|name| !name.is_empty()))
        .unwrap_or("{{user}}")
}

fn archived_remembered_messages(
    remembered: &[Message],
    active_history: &[Message],
) -> Vec<Message> {
    let active_ids = active_history
        .iter()
        .map(|message| message.id.as_str())
        .collect::<std::collections::HashSet<_>>();
    remembered
        .iter()
        .filter(|message| message.remembered && !active_ids.contains(message.id.as_str()))
        .cloned()
        .collect()
}

fn apply_recent_message_limit(history: &[Message], limit: usize) -> Vec<Message> {
    if limit > 0 && history.len() > limit {
        history[history.len() - limit..].to_vec()
    } else {
        history.to_vec()
    }
}

fn append_repetition_guard(
    mut system_prompt: Option<String>,
    history: &[Message],
    visible_history: &[Message],
    settings: &RepetitionGuardSettings,
) -> Option<String> {
    let Some(section) =
        generation_modules::repetition_guard_section(history, visible_history, settings)
    else {
        return system_prompt;
    };
    match &mut system_prompt {
        Some(prompt) if !prompt.trim().is_empty() => {
            prompt.push_str("\n\n");
            prompt.push_str(section.trim());
        }
        _ => system_prompt = Some(section),
    }
    system_prompt
}

fn render_request(system_prompt: Option<&str>, messages: &[Message]) -> String {
    let mut prompt = String::new();
    if let Some(system_prompt) = system_prompt.filter(|value| !value.trim().is_empty()) {
        prompt.push_str("[SYSTEM]\n");
        prompt.push_str(system_prompt.trim());
    }
    for message in messages
        .iter()
        .filter(|message| matches!(message.role.as_str(), "system" | "user" | "assistant"))
    {
        if !prompt.is_empty() {
            prompt.push_str("\n\n");
        }
        let role = match message.role.as_str() {
            "user" => "USER",
            "assistant" => "ASSISTANT",
            _ => "SYSTEM",
        };
        prompt.push('[');
        prompt.push_str(role);
        prompt.push_str("]\n");
        prompt.push_str(message.content.trim());
    }
    prompt
}

fn replace_names(prompt: String, user_name: &str, character_name: &str) -> String {
    prompt
        .replace("{{user}}", user_name)
        .replace("{{char}}", character_name)
}

fn preview_galaxy_item(input: GalaxyItemInput) -> GalaxyItem {
    GalaxyItem {
        id: input.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        kind: input.kind,
        name: input.name,
        description: input.description,
        data: input.data,
        badge: String::new(),
        accent: String::new(),
        updated_at: 0,
    }
}

fn approximate_token_count(value: &str) -> i64 {
    if value.trim().is_empty() {
        return 0;
    }

    value
        .split_whitespace()
        .map(|word| {
            let characters = word.chars().count() as f64;
            let divisor = if word.is_ascii() { 4.0 } else { 2.4 };
            (characters / divisor).ceil().max(1.0) as i64
        })
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn message(id: &str, remembered: bool) -> Message {
        Message {
            id: id.into(),
            chat_id: "chat".into(),
            role: "user".into(),
            content: format!("message {id}"),
            created_at: 0,
            updated_at: 0,
            edited: false,
            remembered,
            active_variant_index: 0,
            variants: Vec::new(),
        }
    }

    #[test]
    fn remembered_messages_still_in_direct_history_are_not_duplicated() {
        let remembered = vec![message("old", true), message("recent", true)];
        let active = vec![message("recent", true)];

        let archived = archived_remembered_messages(&remembered, &active);
        assert_eq!(archived.len(), 1);
        assert_eq!(archived[0].id, "old");
    }

    #[test]
    fn persona_name_wins_over_profile_fallback_in_preview() {
        let persona = GalaxyItemInput {
            id: None,
            kind: "persona".into(),
            name: "Persona name".into(),
            description: String::new(),
            data: serde_json::json!({}),
        };

        assert_eq!(
            preview_user_name(Some(&persona), Some("Profile name")),
            "Persona name"
        );
        assert_eq!(
            preview_user_name(None, Some("Profile name")),
            "Profile name"
        );
    }

    #[test]
    fn token_estimate_handles_empty_ascii_and_unicode_text() {
        assert_eq!(approximate_token_count(""), 0);
        assert_eq!(approximate_token_count("four"), 1);
        assert_eq!(approximate_token_count("привет"), 3);
    }
}
