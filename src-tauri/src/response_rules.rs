fn instruction(preset: &str) -> Option<&'static str> {
    match preset {
        "human" => Some(
            "Use natural conversational rhythm, concrete wording, and emotionally credible reactions. Avoid assistant-like disclaimers, repetitive summaries, sterile headings, and generic offers to help.",
        ),
        "dialogue-only" => Some(
            "Return dialogue only. Do not write actions, stage directions, narration, asterisks, roleplay descriptions, or describe what either participant is doing.",
        ),
        "no-emoji" => Some(
            "Never use emoji, emoticons, decorative symbols, reaction glyphs, or emoji-style punctuation.",
        ),
        "first-person" => Some(
            "Write from the character's first-person perspective. Never narrate the character in third person and never decide or describe the user's actions, thoughts, or feelings for them.",
        ),
        "concise" => Some(
            "Keep replies focused and proportionate to the user's message. Remove repetition, filler, redundant conclusions, and unnecessary restatement of known context.",
        ),
        "immersive" => Some(
            "Preserve the atmosphere, emotional state, physical continuity, and established details of the current scene. Prefer specific sensory details over generic roleplay prose.",
        ),
        "initiative" => Some(
            "Move the conversation forward with relevant choices, reactions, or questions when useful, but never decide the user's actions, thoughts, feelings, or consent.",
        ),
        "continuity" => Some(
            "Before answering, silently check the reply against established facts, relationships, names, chronology, and the latest scene state. Do not contradict them without an explicit in-story reason.",
        ),
        _ => None,
    }
}

pub fn instructions(presets: &[String]) -> Option<String> {
    let mut seen = std::collections::HashSet::new();
    let rendered = presets
        .iter()
        .filter(|preset| seen.insert(preset.as_str()))
        .filter_map(|preset| instruction(preset))
        .map(|value| format!("- {value}"))
        .collect::<Vec<_>>();
    (!rendered.is_empty()).then(|| rendered.join("\n"))
}

pub fn normalize_response(content: &str) -> String {
    content.trim().to_owned()
}

pub fn continuation_instruction(response_language: Option<&str>) -> &'static str {
    if response_language.is_some_and(|language| language.eq_ignore_ascii_case("ru")) {
        "Продолжи предыдущий ответ ассистента естественно с того места, где он закончился. Не повторяй и не пересказывай уже написанный текст. Верни только продолжение без вступления и пояснений."
    } else {
        "Continue the previous assistant response naturally from where it ended. Do not repeat or summarize the existing text. Return only the continuation without an introduction or explanation."
    }
}

pub fn merge_continuation(original: &str, continuation: &str) -> String {
    let original = original.trim_end();
    let continuation = continuation.trim_start();
    if original.is_empty() {
        return continuation.to_owned();
    }
    if continuation.is_empty() {
        return original.to_owned();
    }

    let starts_with_punctuation = continuation.chars().next().is_some_and(|character| {
        matches!(character, ',' | '.' | '!' | '?' | ':' | ';' | '…')
    });
    let ends_complete_thought = original.chars().next_back().is_some_and(|character| {
        matches!(
            character,
            '.' | '!' | '?' | '…' | ':' | ';' | ')' | ']' | '}' | '"' | '»'
        )
    });
    let separator = if starts_with_punctuation {
        ""
    } else if ends_complete_thought {
        "\n\n"
    } else {
        " "
    };

    format!("{original}{separator}{continuation}")
}

#[cfg(test)]
#[path = "../../test/rust/response_rules.rs"]
mod tests;
