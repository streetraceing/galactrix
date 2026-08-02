use uuid::Uuid;

use crate::models::{
    ChatPromptContext, GalaxyItem, GalaxyItemInput, PromptPreviewInput, PromptPreviewResult,
};
use crate::prompt_builder;

pub(crate) fn build(input: PromptPreviewInput) -> PromptPreviewResult {
    let user_name = input
        .user_name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .or_else(|| {
            input
                .persona
                .as_ref()
                .map(|item| item.name.trim())
                .filter(|name| !name.is_empty())
        })
        .unwrap_or("{{user}}")
        .to_owned();
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
    let system_prompt = prompt_builder::build_system_prompt(
        &context,
        &input.remembered_messages,
        input.response_language.as_deref(),
    )
    .unwrap_or_default()
    .replace("{{user}}", &user_name)
    .replace("{{char}}", &character_name);
    let mut prompt = String::new();
    if !system_prompt.trim().is_empty() {
        prompt.push_str("[SYSTEM]\n");
        prompt.push_str(system_prompt.trim());
    }
    for message in input
        .conversation_messages
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

    PromptPreviewResult {
        approximate_tokens: approximate_token_count(&prompt),
        characters: prompt.chars().count() as i64,
        prompt,
    }
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

    #[test]
    fn token_estimate_handles_empty_ascii_and_unicode_text() {
        assert_eq!(approximate_token_count(""), 0);
        assert_eq!(approximate_token_count("four"), 1);
        assert_eq!(approximate_token_count("привет"), 3);
    }
}
