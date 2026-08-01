fn instruction(preset: &str) -> Option<&'static str> {
    match preset {
        "human" => Some(
            "Use natural conversational rhythm, concrete wording, and emotionally credible reactions. Avoid assistant-like disclaimers, repetitive summaries, sterile headings, and generic offers to help.",
        ),
        "casual-brief" => Some(
            "Default to a brief everyday chat reply. Usually write 1–3 short sentences, with one idea per sentence and simple vocabulary. Avoid long compound sentences, formal exposition, preambles, summaries, and unsolicited detail. Match the user's length, and expand only when they explicitly ask for detail or the task genuinely requires it.",
        ),
        "casual-lowercase" => Some(
            "Write in a relaxed everyday chat style. Start most ordinary sentences and fragments with lowercase letters, prefer commas or short line breaks over frequent full stops, and keep the wording natural rather than formal. Preserve conventional capitalization for personal names, place names, brands, acronyms, code, URLs, identifiers, and exact quotations.",
        ),
        "strict-lowercase" => Some(
            "Treat lowercase casual chat as a strict output constraint. Write almost every ordinary conversational sentence and fragment in lowercase, including the first word of the reply. Avoid polished formal phrasing and avoid unnecessary full stops; prefer commas, short fragments, and natural colloquial wording. For example, write 'прост проверял связь, что делаешь?' instead of 'Просто проверял связь. Что делаешь?'. Capitalize only where meaning or spelling requires it: personal names, place names, brands, acronyms, code, URLs, identifiers, and exact quotations. Never ignore this rule merely because normal grammar would capitalize the start of a sentence.",
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
        "roleplay-actions" => Some(
            "Write roleplay as a continuous scene with natural dialogue, purposeful character actions, body language, and selective sensory detail. Do not turn every reply into ornate prose, and do not use empty stage directions that add no new information.",
        ),
        "no-user-control" => Some(
            "Never decide, narrate, or imply the user's actions, thoughts, feelings, dialogue, consent, or reactions. Leave the user's agency open and respond only through the character and the world around them.",
        ),
        "character-consistency" => Some(
            "Keep the character's voice, knowledge, motives, boundaries, relationships, and emotional state consistent with the definition and established conversation. Let changes happen only through believable in-scene development.",
        ),
        "scene-pacing" => Some(
            "Advance the scene at a natural pace. Give the user meaningful room to respond, avoid skipping major beats or resolving conflicts too quickly, and vary reply length according to the moment.",
        ),
        "telegram-chat" => Some(
            "Write like a real private messenger conversation: mostly lowercase, short fragments, contractions, colloquial wording, occasional natural abbreviations or minor typos, and fewer full stops. Do not deliberately corrupt every word or make the text hard to read. Keep proper names, brands, acronyms, code, links, and identifiers correctly capitalized.",
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RegenerationMode {
    Reply,
    Continuation,
}

pub fn regeneration_mode(previous_role: Option<&str>) -> Option<RegenerationMode> {
    match previous_role {
        Some("user") => Some(RegenerationMode::Reply),
        Some("assistant") => Some(RegenerationMode::Continuation),
        _ => None,
    }
}

pub fn regeneration_instruction(
    mode: RegenerationMode,
    response_language: Option<&str>,
) -> Option<&'static str> {
    matches!(mode, RegenerationMode::Continuation)
        .then(|| continuation_instruction(response_language))
}

pub fn continuation_instruction(response_language: Option<&str>) -> &'static str {
    if response_language.is_some_and(|language| language.eq_ignore_ascii_case("ru")) {
        "Продолжи предыдущий ответ ассистента естественно с того места, где он закончился. Не повторяй и не пересказывай уже написанный текст. Верни только продолжение без вступления и пояснений."
    } else {
        "Continue the previous assistant response naturally from where it ended. Do not repeat or summarize the existing text. Return only the continuation without an introduction or explanation."
    }
}

#[cfg(test)]
#[path = "../../test/rust/response_rules.rs"]
mod tests;
