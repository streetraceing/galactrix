use std::collections::{HashMap, HashSet};

use rusqlite::Connection;
use serde_json::Value;

use crate::db;
use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{AppBackupArchive, AppBackupPreview};
use crate::secure_storage;

const BACKUP_FORMAT: &str = "galactrix-backup";
const BACKUP_FORMAT_VERSION: u32 = 1;
const MAX_BACKUP_BYTES: usize = 128 * 1024 * 1024;
const MAX_API_KEYS_PER_PROVIDER: usize = 100;

pub(crate) fn create_archive(
    connection: &Connection,
    include_credentials: bool,
    app_version: &str,
) -> CommandResult<AppBackupArchive> {
    let mut data = db::backup_data(connection)?;
    if include_credentials {
        for entry in &mut data.providers {
            let id = entry
                .provider
                .id
                .as_deref()
                .ok_or_else(|| CommandError::new(keys::BACKUP_INVALID))?;
            entry.api_keys = secure_storage::read_provider_secret(id)?.and_then(|secret| {
                let keys = normalize_keys(secret.lines());
                (!keys.is_empty()).then_some(keys)
            });
        }
    }
    Ok(AppBackupArchive {
        format: BACKUP_FORMAT.into(),
        format_version: BACKUP_FORMAT_VERSION,
        source_app_version: app_version.into(),
        created_at: now_unix(),
        credentials_included: include_credentials,
        data,
    })
}

pub(crate) fn inspect_archive(value: Value) -> CommandResult<AppBackupPreview> {
    let archive = parse_archive(value)?;
    Ok(preview(&archive))
}

pub(crate) fn parse_archive(value: Value) -> CommandResult<AppBackupArchive> {
    let encoded_size = serde_json::to_vec(&value)?.len();
    if encoded_size > MAX_BACKUP_BYTES {
        return Err(CommandError::new(keys::BACKUP_TOO_LARGE));
    }

    let mut archive = serde_json::from_value::<AppBackupArchive>(value)
        .map_err(|_| CommandError::new(keys::BACKUP_INVALID))?;
    if archive.format != BACKUP_FORMAT {
        return Err(CommandError::new(keys::BACKUP_INVALID));
    }
    if archive.format_version != BACKUP_FORMAT_VERSION {
        return Err(CommandError::new(keys::BACKUP_UNSUPPORTED_VERSION)
            .with_variable("version", archive.format_version));
    }
    if archive.source_app_version.trim().is_empty()
        || archive.source_app_version.len() > 64
        || archive.created_at < 0
    {
        return Err(CommandError::new(keys::BACKUP_INVALID));
    }

    for entry in &mut archive.data.providers {
        let normalized = normalize_keys(entry.api_keys.iter().flatten().map(String::as_str));
        if normalized.len() > MAX_API_KEYS_PER_PROVIDER {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
        entry.api_keys = (!normalized.is_empty()).then_some(normalized);
        if !archive.credentials_included && entry.api_keys.is_some() {
            return Err(CommandError::new(keys::BACKUP_INVALID));
        }
    }

    db::validate_backup_data(&archive.data)?;
    Ok(archive)
}

pub(crate) fn restore_archive(
    connection: &Connection,
    archive: &AppBackupArchive,
) -> CommandResult<()> {
    db::validate_backup_data(&archive.data)?;

    let target_provider_ids = archive
        .data
        .providers
        .iter()
        .filter_map(|entry| entry.provider.id.clone())
        .collect::<HashSet<_>>();
    let mut affected_provider_ids = db::provider_ids(connection)?;
    affected_provider_ids.extend(target_provider_ids);

    let mut previous_secrets = HashMap::new();
    for id in &affected_provider_ids {
        previous_secrets.insert(id.clone(), secure_storage::read_provider_secret(id)?);
    }

    let target_secrets = archive
        .data
        .providers
        .iter()
        .filter_map(|entry| {
            let id = entry.provider.id.clone()?;
            let secret = entry
                .api_keys
                .as_ref()
                .map(|keys| keys.join("\n"))
                .filter(|value| !value.is_empty());
            Some((id, secret))
        })
        .collect::<HashMap<_, _>>();

    let transaction = connection.unchecked_transaction()?;
    db::replace_with_backup(&transaction, &archive.data)?;

    if let Err(error) = apply_secrets(&affected_provider_ids, &target_secrets) {
        transaction.rollback().map_err(rollback_failed)?;
        restore_secrets(&previous_secrets).map_err(rollback_failed)?;
        return Err(error);
    }

    if let Err(error) = transaction.commit() {
        restore_secrets(&previous_secrets).map_err(rollback_failed)?;
        return Err(CommandError::internal(error));
    }
    Ok(())
}

fn preview(archive: &AppBackupArchive) -> AppBackupPreview {
    AppBackupPreview {
        format_version: archive.format_version,
        source_app_version: archive.source_app_version.clone(),
        created_at: archive.created_at,
        credentials_included: archive.credentials_included,
        credential_count: archive
            .data
            .providers
            .iter()
            .filter(|entry| entry.api_keys.as_ref().is_some_and(|keys| !keys.is_empty()))
            .count(),
        chat_count: archive.data.chats.len(),
        message_count: archive.data.messages.len(),
        variant_count: archive
            .data
            .messages
            .iter()
            .map(|message| message.variants.len())
            .sum(),
        galaxy_item_count: archive.data.galaxy_items.len(),
        provider_count: archive.data.providers.len(),
        usage_day_count: archive.data.usage.len(),
    }
}

fn apply_secrets(
    affected_provider_ids: &HashSet<String>,
    target_secrets: &HashMap<String, Option<String>>,
) -> CommandResult<()> {
    let mut ids = affected_provider_ids.iter().collect::<Vec<_>>();
    ids.sort();
    for id in ids {
        match target_secrets.get(id).and_then(Option::as_deref) {
            Some(secret) => secure_storage::save_provider_secret(id, secret)?,
            None => secure_storage::delete_provider_secret(id)?,
        }
    }
    Ok(())
}

fn restore_secrets(previous: &HashMap<String, Option<String>>) -> CommandResult<()> {
    for (id, secret) in previous {
        match secret.as_deref() {
            Some(secret) => secure_storage::save_provider_secret(id, secret)?,
            None => secure_storage::delete_provider_secret(id)?,
        }
    }
    Ok(())
}

fn rollback_failed(detail: impl std::fmt::Display) -> CommandError {
    CommandError::with_detail(keys::BACKUP_ROLLBACK_FAILED, detail)
}

fn normalize_keys<'a>(values: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut keys = Vec::new();
    for value in values {
        for key in value.lines().map(str::trim).filter(|key| !key.is_empty()) {
            if !keys.iter().any(|saved| saved == key) {
                keys.push(key.to_owned());
            }
        }
    }
    keys
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AppBackupData, AppSettings};

    #[test]
    fn rejects_hidden_credentials_when_archive_flag_is_off() {
        let value = serde_json::json!({
            "format": BACKUP_FORMAT,
            "formatVersion": BACKUP_FORMAT_VERSION,
            "sourceAppVersion": "1.4.0",
            "createdAt": 1,
            "credentialsIncluded": false,
            "data": {
                "chats": [],
                "messages": [],
                "galaxyItems": [],
                "providers": [{
                    "provider": {
                        "id": "provider",
                        "name": "Provider",
                        "kind": "custom",
                        "model": "model",
                        "baseUrl": "https://example.com/v1",
                        "accountId": null,
                        "temperature": 0.7,
                        "topP": 0.95,
                        "maxTokens": 4096,
                        "embeddingModel": null,
                        "embeddingBaseUrl": null
                    },
                    "apiKeys": ["secret"]
                }],
                "settings": AppSettings::default(),
                "usage": []
            }
        });

        let error = parse_archive(value).expect_err("hidden credentials must be rejected");
        assert_eq!(error.key, keys::BACKUP_INVALID);
    }

    #[test]
    fn empty_archive_has_a_stable_preview() {
        let archive = AppBackupArchive {
            format: BACKUP_FORMAT.into(),
            format_version: BACKUP_FORMAT_VERSION,
            source_app_version: "1.4.0".into(),
            created_at: 10,
            credentials_included: false,
            data: AppBackupData {
                chats: Vec::new(),
                messages: Vec::new(),
                galaxy_items: Vec::new(),
                providers: Vec::new(),
                settings: AppSettings::default(),
                usage: Vec::new(),
            },
        };

        let result = preview(&archive);
        assert_eq!(result.source_app_version, "1.4.0");
        assert_eq!(result.chat_count, 0);
        assert_eq!(result.credential_count, 0);
    }
}
