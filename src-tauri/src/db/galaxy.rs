use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{GalaxyItem, GalaxyItemInput, PromptConfig};

use super::{
    now_unix, parse_prompt_config, prompt_config_json, validate_optional_galaxy,
    validate_prompt_config,
};

pub(crate) fn upsert_galaxy_item(
    connection: &Connection,
    id: &str,
    input: &GalaxyItemInput,
) -> CommandResult<GalaxyItem> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(CommandError::new(keys::COMMON_NAME_REQUIRED));
    }
    if name.chars().count() > 120 {
        return Err(CommandError::new(keys::COMMON_NAME_TOO_LONG));
    }
    if !input.data.is_object() {
        return Err(CommandError::new(keys::GALAXY_DATA_MUST_BE_OBJECT));
    }
    validate_galaxy_data(connection, input)?;

    let existing_kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    if existing_kind
        .as_deref()
        .is_some_and(|kind| kind != input.kind.as_str())
    {
        return Err(CommandError::new(keys::GALAXY_KIND_IMMUTABLE));
    }

    let (badge, accent) = galaxy_presentation(&input.kind)?;
    let now = now_unix();
    let data_json = serde_json::to_string(&input.data)?;
    if data_json.len() > 1_000_000 {
        return Err(CommandError::new(keys::GALAXY_DATA_TOO_LARGE));
    }
    connection.execute(
        r#"INSERT INTO galaxy_items (id, kind, name, description, data_json, badge, accent, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
           ON CONFLICT(id) DO UPDATE SET
             kind = excluded.kind,
             name = excluded.name,
             description = excluded.description,
             data_json = excluded.data_json,
             badge = excluded.badge,
             accent = excluded.accent,
             updated_at = excluded.updated_at"#,
        params![
            id,
            input.kind,
            name,
            input.description.trim(),
            data_json,
            badge,
            accent,
            now
        ],
    )?;
    Ok(GalaxyItem {
        id: id.into(),
        kind: input.kind.clone(),
        name: name.into(),
        description: input.description.trim().into(),
        data: input.data.clone(),
        badge: badge.into(),
        accent: accent.into(),
        updated_at: now,
    })
}

fn validate_galaxy_data(connection: &Connection, input: &GalaxyItemInput) -> CommandResult<()> {
    if input.kind == "prompt-set" {
        let config = serde_json::from_value::<PromptConfig>(input.data.clone())
            .map_err(|_| CommandError::new(keys::PROMPT_SET_INVALID))?;
        if !config.set_ids.is_empty() {
            return Err(CommandError::new(keys::PROMPT_SET_NESTED_NOT_ALLOWED));
        }
        return validate_prompt_config(&config);
    }

    if input.kind == "character" {
        let preset = input
            .data
            .get("stylePreset")
            .and_then(Value::as_str)
            .unwrap_or("neutral");
        if !matches!(
            preset,
            "neutral"
                | "warm"
                | "concise"
                | "casual-lowercase"
                | "roleplay-rich"
                | "telegram-human"
                | "short-messages"
                | "long-messages"
                | "roleplay"
                | "literary"
                | "custom"
        ) {
            return Err(CommandError::new(keys::GALAXY_STYLE_PRESET_UNKNOWN));
        }

        if preset == "custom" {
            let style_id = input
                .data
                .get("styleItemId")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| CommandError::new(keys::GALAXY_SAVED_STYLE_REQUIRED))?;
            validate_optional_galaxy(connection, Some(style_id), "style")?;
        }

        if let Some(ids) = input.data.get("promptSetIds").and_then(Value::as_array) {
            for id in ids {
                let id = id
                    .as_str()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| CommandError::new(keys::GALAXY_PROMPT_SET_REFERENCE_INVALID))?;
                validate_optional_galaxy(connection, Some(id), "prompt-set")?;
            }
        }
    }

    Ok(())
}

pub(super) fn get_galaxy_item(connection: &Connection, id: &str) -> CommandResult<GalaxyItem> {
    connection
        .query_row(
            "SELECT id, kind, name, description, data_json, badge, accent, updated_at
             FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| {
                let data_json: String = row.get(4)?;
                Ok(GalaxyItem {
                    id: row.get(0)?,
                    kind: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    data: serde_json::from_str(&data_json)
                        .unwrap_or(Value::Object(Default::default())),
                    badge: row.get(5)?,
                    accent: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::GALAXY_NOT_FOUND))
}

pub(crate) fn delete_galaxy_item(connection: &Connection, id: &str) -> CommandResult<()> {
    let kind = connection
        .query_row(
            "SELECT kind FROM galaxy_items WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| CommandError::new(keys::GALAXY_NOT_FOUND))?;

    let transaction = connection.unchecked_transaction()?;
    transaction.execute(
        "UPDATE chats SET persona_id = NULL WHERE persona_id = ?1",
        params![id],
    )?;
    transaction.execute(
        "UPDATE chats SET character_id = NULL WHERE character_id = ?1",
        params![id],
    )?;
    transaction.execute(
        "UPDATE chats SET universe_id = NULL WHERE universe_id = ?1",
        params![id],
    )?;
    transaction.execute(
        "DELETE FROM chat_worldbooks WHERE worldbook_id = ?1",
        params![id],
    )?;

    if kind == "style" {
        transaction.execute(
            "UPDATE chats SET style_item_id = NULL WHERE style_item_id = ?1",
            params![id],
        )?;
        clear_character_style_references(&transaction, id)?;
    }
    if kind == "prompt-set" {
        clear_prompt_set_references(&transaction, id)?;
    }

    transaction.execute("DELETE FROM galaxy_items WHERE id = ?1", params![id])?;
    transaction.commit().map_err(CommandError::internal)
}

fn clear_character_style_references(connection: &Connection, style_id: &str) -> CommandResult<()> {
    let mut statement =
        connection.prepare("SELECT id, data_json FROM galaxy_items WHERE kind = 'character'")?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (character_id, data_json) in rows {
        let mut data =
            serde_json::from_str::<Value>(&data_json).unwrap_or(Value::Object(Default::default()));
        let references_style = data
            .get("styleItemId")
            .and_then(Value::as_str)
            .is_some_and(|value| value == style_id);
        if !references_style {
            continue;
        }

        if let Some(object) = data.as_object_mut() {
            object.insert("stylePreset".into(), Value::String("neutral".into()));
            object.remove("styleItemId");
        }
        let updated = serde_json::to_string(&data)?;
        connection.execute(
            "UPDATE galaxy_items SET data_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![updated, now_unix(), character_id],
        )?;
    }

    Ok(())
}

fn clear_prompt_set_references(connection: &Connection, prompt_set_id: &str) -> CommandResult<()> {
    let mut statement =
        connection.prepare("SELECT id, data_json FROM galaxy_items WHERE kind = 'character'")?;
    let characters = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (character_id, data_json) in characters {
        let mut data =
            serde_json::from_str::<Value>(&data_json).unwrap_or(Value::Object(Default::default()));
        let Some(ids) = data.get_mut("promptSetIds").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = ids.len();
        ids.retain(|value| value.as_str() != Some(prompt_set_id));
        if ids.len() == before {
            continue;
        }
        connection.execute(
            "UPDATE galaxy_items SET data_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![serde_json::to_string(&data)?, now_unix(), character_id],
        )?;
    }

    let mut statement =
        connection.prepare("SELECT id, prompt_config_json, response_preset FROM chats")?;
    let chats = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (chat_id, raw_config, legacy_preset) in chats {
        let mut config = parse_prompt_config(&raw_config, &legacy_preset);
        let before = config.set_ids.len();
        config.set_ids.retain(|id| id != prompt_set_id);
        if config.set_ids.len() == before {
            continue;
        }
        connection.execute(
            "UPDATE chats SET prompt_config_json = ?1 WHERE id = ?2",
            params![prompt_config_json(&config)?, chat_id],
        )?;
    }
    Ok(())
}

fn galaxy_presentation(kind: &str) -> CommandResult<(&'static str, &'static str)> {
    match kind {
        "persona" => Ok(("galaxy.kind.persona", "slate")),
        "character" => Ok(("galaxy.kind.character", "blue")),
        "universe" => Ok(("galaxy.kind.universe", "indigo")),
        "worldbook" => Ok(("galaxy.kind.worldbook", "amber")),
        "style" => Ok(("galaxy.kind.style", "violet")),
        "prompt-set" => Ok(("galaxy.kind.promptSet", "emerald")),
        _ => Err(CommandError::new(keys::GALAXY_KIND_UNKNOWN)),
    }
}
