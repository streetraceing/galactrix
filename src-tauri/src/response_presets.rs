pub fn instructions(preset: &str) -> Option<&'static str> {
    match preset {
        "human" => Some(
            "Write like a real person in a private conversation: use natural rhythm, contractions where appropriate, concrete wording, and emotionally credible reactions. Avoid assistant-like disclaimers, repetitive summaries, sterile section headings, and generic offers to help.",
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
        "clean-human" => Some(
            "Write like a real person in a private conversation. Use first person, natural concise wording, and emotionally credible reactions. Do not use emoji, actions, stage directions, asterisks, assistant disclaimers, generic offers to help, or third-person narration.",
        ),
        _ => None,
    }
}

pub fn apply(preset: &str, content: &str) -> String {
    let mut value = content.trim().to_string();
    if matches!(preset, "dialogue-only" | "clean-human") {
        value = strip_actions(&value);
    }
    if matches!(preset, "no-emoji" | "clean-human") {
        value = value
            .chars()
            .filter(|character| !is_emoji(*character))
            .collect();
    }
    normalize_whitespace(&value)
}

fn strip_actions(input: &str) -> String {
    let without_asterisk_actions = strip_single_delimited(input, '*');

    without_asterisk_actions
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !((trimmed.starts_with('(') && trimmed.ends_with(')'))
                || (trimmed.starts_with('[') && trimmed.ends_with(']')))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn strip_single_delimited(input: &str, delimiter: char) -> String {
    let characters = input.chars().collect::<Vec<_>>();
    let mut output = String::with_capacity(input.len());
    let mut index = 0;

    while index < characters.len() {
        if characters[index] != delimiter {
            output.push(characters[index]);
            index += 1;
            continue;
        }

        // Preserve Markdown bold markers (`**text**` and `__text__`).
        if characters.get(index + 1) == Some(&delimiter) {
            output.push(delimiter);
            output.push(delimiter);
            index += 2;
            continue;
        }

        let closing = (index + 1..characters.len()).find(|candidate| {
            characters[*candidate] == delimiter
                && characters.get(candidate.saturating_sub(1)) != Some(&delimiter)
                && characters.get(candidate + 1) != Some(&delimiter)
        });

        if let Some(closing) = closing {
            index = closing + 1;
        } else {
            output.push(delimiter);
            index += 1;
        }
    }

    output
}

fn is_emoji(character: char) -> bool {
    let code = character as u32;
    matches!(
        code,
        0x1F000..=0x1FAFF
            | 0x2600..=0x27BF
            | 0x2300..=0x23FF
            | 0xFE0F
            | 0x200D
    )
}

fn normalize_whitespace(input: &str) -> String {
    let mut output = String::new();
    let mut blank_lines = 0;
    for line in input.lines() {
        let trimmed_end = line.trim_end();
        if trimmed_end.trim().is_empty() {
            blank_lines += 1;
            if blank_lines <= 1 {
                output.push('\n');
            }
        } else {
            blank_lines = 0;
            if !output.is_empty() && !output.ends_with('\n') {
                output.push('\n');
            }
            output.push_str(trimmed_end);
            output.push('\n');
        }
    }
    output.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::{apply, strip_actions};

    #[test]
    fn removes_roleplay_actions_but_preserves_markdown_bold() {
        assert_eq!(
            strip_actions("*smiles* Hello, **important** text."),
            " Hello, **important** text."
        );
    }

    #[test]
    fn removes_emoji_and_trims_the_result() {
        assert_eq!(apply("no-emoji", "  Hello 🙂  "), "Hello");
    }
}
