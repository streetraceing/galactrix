use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection};

use crate::app_settings;
use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    AppBackupData, BackupProvider, ChatConfigInput, GalaxyItemInput, ProviderInput,
};
use crate::provider_support;

use super::{
    generation_settings_json, migrate, module_overrides_json, prompt_config_json,
    replace_chat_worldbooks, snapshot, validate_chat_links,
};

const MAX_CHATS: usize = 100_000;
const MAX_MESSAGES: usize = 1_000_000;
const MAX_VARIANTS: usize = 1_000_000;
const MAX_GALAXY_ITEMS: usize = 100_000;
const MAX_PROVIDERS: usize = 1_000;
const MAX_USAGE_DAYS: usize = 100_000;
const MAX_ID_LENGTH: usize = 200;

pub(crate) fn backup_data(connection: &Connection) -> CommandResult<AppBackupData> {
    let current = snapshot(connection, "")?;
    Ok(AppBackupData {
        chats: current.chats,
        messages: current.messages,
        galaxy_items: current.galaxy_items,
        providers: current
            .providers
            .iter()
            .map(|provider| BackupProvider {
                provider: ProviderInput::from(provider),
                api_keys: None,
            })
            .collect(),
        settings: current.settings,
        usage: current
            .usage
            .into_iter()
            .filter(|point| {
                point.input_tokens != 0 || point.output_tokens != 0 || point.requests != 0
            })
            .collect(),
    })
}

pub(crate) fn validate_backup_data(data: &AppBackupData) -> CommandResult<()> {
    validate_structure(data)?;
    let connection = Connection::open_in_memory().map_err(CommandError::internal)?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&connection)?;
    let transaction = connection.unchecked_transaction()?;
    replace_with_backup(&transaction, data)?;
    transaction.rollback().map_err(CommandError::internal)
}

pub(crate) fn replace_with_backup(
    connection: &Connection,
    data: &AppBackupData,
) -> CommandResult<()> {
    validate_structure(data)?;
    connection.execute_batch(
        r#"
            DELETE FROM semantic_memories;
            DELETE FROM chat_contexts;
            DELETE FROM usage_events;
            DELETE FROM messages;
            DELETE FROM chat_worldbooks;
            DELETE FROM chats;
            DELETE FROM galaxy_items;
            DELETE FROM providers;
        "#,
    )?;

    for entry in &data.providers {
        let id = entry
            .provider
            .id
            .clone()
            .ok_or_else(|| invalid_reference("provider"))?;
        let provider = entry
            .provider
            .clone()
            .into_provider(id, "disabled".into(), None);
        super::save_provider(connection, &provider)?;
    }

    let mut galaxy_items = data.galaxy_items.iter().collect::<Vec<_>>();
    galaxy_items.sort_by_key(|item| match item.kind.as_str() {
        "style" | "prompt-set" => 0,
        "character" => 2,
        _ => 1,
    });
    for item in galaxy_items {
        let input = GalaxyItemInput {
            id: Some(item.id.clone()),
            kind: item.kind.clone(),
            name: item.name.clone(),
            description: item.description.clone(),
            data: item.data.clone(),
        };
        super::upsert_galaxy_item(connection, &item.id, &input)?;
        connection.execute(
            "UPDATE galaxy_items SET updated_at = ?1 WHERE id = ?2",
            params![item.updated_at, item.id],
        )?;
    }

    for chat in &data.chats {
        let input = ChatConfigInput {
            title: chat.title.clone(),
            auto_title: chat.auto_title,
            automatic_title_base: None,
            greeting_message: chat.greeting_message.clone(),
            provider_id: chat.provider_id.clone(),
            persona_id: chat.persona_id.clone(),
            character_id: chat.character_id.clone(),
            style_item_id: chat.style_item_id.clone(),
            universe_id: chat.universe_id.clone(),
            worldbook_ids: chat.worldbook_ids.clone(),
            prompt_config: chat.prompt_config.clone(),
            generation_settings: chat.generation_settings.clone(),
            module_overrides: chat.module_overrides.clone(),
        };
        validate_chat_links(connection, &input, true)?;
        connection.execute(
            r#"INSERT INTO chats (
                    id, title, preview, updated_at, message_count, pinned, archived,
                    auto_title, greeting_message, provider_id, persona_id, character_id,
                    style_item_id, universe_id, response_preset, prompt_config_json,
                    module_overrides_json, generation_settings_json
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                         ?13, ?14, 'natural', ?15, ?16, ?17)"#,
            params![
                chat.id,
                chat.title,
                chat.preview,
                chat.updated_at,
                chat.message_count,
                chat.pinned as i64,
                chat.archived as i64,
                chat.auto_title as i64,
                chat.greeting_message.as_deref().unwrap_or(""),
                chat.provider_id,
                chat.persona_id,
                chat.character_id,
                chat.style_item_id,
                chat.universe_id,
                prompt_config_json(&chat.prompt_config)?,
                module_overrides_json(&chat.module_overrides)?,
                generation_settings_json(&chat.generation_settings)?,
            ],
        )?;
        replace_chat_worldbooks(connection, &chat.id, &chat.worldbook_ids)?;
    }

    for message in &data.messages {
        connection.execute(
            r#"INSERT INTO messages (
                    id, chat_id, role, content, created_at, updated_at, edited,
                    remembered, active_variant_index
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
            params![
                message.id,
                message.chat_id,
                message.role,
                message.content,
                message.created_at,
                message.updated_at,
                message.edited as i64,
                message.remembered as i64,
                message.active_variant_index,
            ],
        )?;
        for variant in &message.variants {
            connection.execute(
                r#"INSERT INTO message_variants (
                        id, message_id, position, content, created_at, edited
                   ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"#,
                params![
                    variant.id,
                    message.id,
                    variant.index,
                    variant.content,
                    variant.created_at,
                    variant.edited as i64,
                ],
            )?;
        }
    }

    for point in &data.usage {
        if point.input_tokens == 0 && point.output_tokens == 0 && point.requests == 0 {
            continue;
        }
        connection.execute(
            r#"INSERT INTO usage_events (
                    id, provider_id, model, input_tokens, output_tokens, request_count, created_at
               ) VALUES (?1, NULL, 'restored-backup', ?2, ?3, ?4, ?5)"#,
            params![
                format!("backup-usage-{}", point.day),
                point.input_tokens,
                point.output_tokens,
                point.requests,
                point.day.saturating_mul(86_400).saturating_add(43_200),
            ],
        )?;
    }

    let provider_ids = data
        .providers
        .iter()
        .filter_map(|entry| entry.provider.id.clone())
        .collect::<HashSet<_>>();
    let settings = app_settings::normalize(data.settings.clone(), &provider_ids)?;
    super::update_settings(connection, &settings)
}

fn validate_structure(data: &AppBackupData) -> CommandResult<()> {
    if data.chats.len() > MAX_CHATS
        || data.messages.len() > MAX_MESSAGES
        || data.galaxy_items.len() > MAX_GALAXY_ITEMS
        || data.providers.len() > MAX_PROVIDERS
        || data.usage.len() > MAX_USAGE_DAYS
    {
        return Err(CommandError::new(keys::BACKUP_TOO_LARGE));
    }

    let chat_ids = unique_ids(data.chats.iter().map(|item| item.id.as_str()), "chat")?;
    let provider_ids = unique_ids(
        data.providers
            .iter()
            .map(|entry| entry.provider.id.as_deref().unwrap_or("")),
        "provider",
    )?;
    let _galaxy_ids = unique_ids(
        data.galaxy_items.iter().map(|item| item.id.as_str()),
        "Galaxy object",
    )?;
    let mut galaxy_kinds = HashMap::new();
    for item in &data.galaxy_items {
        if item.updated_at < 0 {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
        galaxy_kinds.insert(item.id.as_str(), item.kind.as_str());
    }

    for entry in &data.providers {
        provider_support::validate_input(&entry.provider)?;
        if entry.provider.kind == "character-ai" {
            return Err(CommandError::new(keys::PROVIDER_CHARACTER_AI_UNSUPPORTED));
        }
    }
    for chat in &data.chats {
        if chat.title.trim().is_empty() {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
        validate_optional_reference(chat.provider_id.as_deref(), &provider_ids, "provider")?;
        validate_typed_galaxy(chat.persona_id.as_deref(), &galaxy_kinds, "persona")?;
        validate_typed_galaxy(chat.character_id.as_deref(), &galaxy_kinds, "character")?;
        validate_typed_galaxy(chat.style_item_id.as_deref(), &galaxy_kinds, "style")?;
        validate_typed_galaxy(chat.universe_id.as_deref(), &galaxy_kinds, "universe")?;
        for id in &chat.worldbook_ids {
            validate_typed_galaxy(Some(id), &galaxy_kinds, "worldbook")?;
        }
        for id in &chat.prompt_config.set_ids {
            validate_typed_galaxy(Some(id), &galaxy_kinds, "prompt-set")?;
        }
    }

    validate_optional_reference(
        data.settings
            .ai_modules
            .dynamic_context
            .provider_id
            .as_deref(),
        &provider_ids,
        "settings provider",
    )?;
    validate_optional_reference(
        data.settings
            .ai_modules
            .semantic_memory
            .provider_id
            .as_deref(),
        &provider_ids,
        "settings provider",
    )?;

    let message_ids = unique_ids(data.messages.iter().map(|item| item.id.as_str()), "message")?;
    let mut variant_ids = HashSet::new();
    let mut message_counts = HashMap::<&str, i64>::new();
    let mut latest_messages = HashMap::<&str, (i64, usize, &str)>::new();
    let mut variant_count = 0usize;
    for (order, message) in data.messages.iter().enumerate() {
        if !chat_ids.contains(message.chat_id.as_str()) {
            return Err(invalid_reference("message chat"));
        }
        if !matches!(message.role.as_str(), "system" | "user" | "assistant")
            || message.content.trim().is_empty()
            || message.created_at < 0
            || message.updated_at < message.created_at
        {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
        *message_counts.entry(message.chat_id.as_str()).or_default() += 1;
        let latest = latest_messages.entry(message.chat_id.as_str()).or_insert((
            message.created_at,
            order,
            message.content.as_str(),
        ));
        if (message.created_at, order) > (latest.0, latest.1) {
            *latest = (message.created_at, order, message.content.as_str());
        }

        if message.role == "assistant" {
            if message.variants.is_empty() {
                return Err(CommandError::new(keys::BACKUP_INVALID));
            }
            let mut positions = HashSet::new();
            let mut active_content = None;
            for variant in &message.variants {
                validate_id(&variant.id)?;
                if !variant_ids.insert(variant.id.as_str())
                    || !positions.insert(variant.index)
                    || variant.index < 0
                    || variant.content.trim().is_empty()
                    || variant.created_at < 0
                {
                    return Err(CommandError::new(keys::BACKUP_INVALID));
                }
                if variant.index == message.active_variant_index {
                    active_content = Some(variant.content.as_str());
                }
            }
            if active_content != Some(message.content.as_str()) {
                return Err(CommandError::new(keys::BACKUP_INVALID));
            }
        } else if !message.variants.is_empty() || message.active_variant_index != 0 {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
        variant_count = variant_count.saturating_add(message.variants.len());
    }
    if variant_count > MAX_VARIANTS || message_ids.len() != data.messages.len() {
        return Err(CommandError::new(keys::BACKUP_TOO_LARGE));
    }

    for chat in &data.chats {
        let count = message_counts
            .get(chat.id.as_str())
            .copied()
            .unwrap_or_default();
        let preview = latest_messages
            .get(chat.id.as_str())
            .map(|(_, _, content)| *content)
            .unwrap_or("");
        if chat.message_count != count || chat.preview != preview || chat.updated_at < 0 {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
    }

    for point in &data.usage {
        if point.day < 0
            || point.input_tokens < 0
            || point.output_tokens < 0
            || point.requests < 0
            || point.tokens != point.input_tokens + point.output_tokens
        {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
    }
    Ok(())
}

fn unique_ids<'a>(
    ids: impl Iterator<Item = &'a str>,
    kind: &str,
) -> CommandResult<HashSet<&'a str>> {
    let mut unique = HashSet::new();
    for id in ids {
        validate_id(id)?;
        if !unique.insert(id) {
            return Err(CommandError::new(keys::BACKUP_DUPLICATE_ID).with_variable("kind", kind));
        }
    }
    Ok(unique)
}

fn validate_id(id: &str) -> CommandResult<()> {
    if id.trim().is_empty() || id.trim() != id || id.len() > MAX_ID_LENGTH {
        return Err(CommandError::new(keys::BACKUP_INVALID));
    }
    Ok(())
}

fn validate_optional_reference(
    id: Option<&str>,
    ids: &HashSet<&str>,
    kind: &str,
) -> CommandResult<()> {
    if id.is_some_and(|id| !ids.contains(id)) {
        return Err(invalid_reference(kind));
    }
    Ok(())
}

fn validate_typed_galaxy(
    id: Option<&str>,
    kinds: &HashMap<&str, &str>,
    expected_kind: &str,
) -> CommandResult<()> {
    if id.is_some_and(|id| kinds.get(id).copied() != Some(expected_kind)) {
        return Err(invalid_reference(expected_kind));
    }
    Ok(())
}

fn invalid_reference(kind: &str) -> CommandError {
    CommandError::new(keys::BACKUP_BROKEN_REFERENCE).with_variable("kind", kind)
}
