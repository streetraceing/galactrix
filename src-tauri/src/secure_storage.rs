use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "android")]
use std::collections::HashMap;

use crate::i18n::{keys, CommandError, CommandResult};

const SERVICE_NAME: &str = "Galactrix";

static INITIALIZED: OnceLock<()> = OnceLock::new();
static INITIALIZATION_LOCK: Mutex<()> = Mutex::new(());

fn configure_store() -> CommandResult<()> {
    #[cfg(target_os = "android")]
    {
        let config = HashMap::new();
        keyring::cli::use_android_native_store(&config)
            .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
    }
    #[cfg(not(target_os = "android"))]
    {
        keyring::cli::use_native_store(false)
            .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
    }
}

pub fn initialize() -> CommandResult<()> {
    if INITIALIZED.get().is_some() {
        return Ok(());
    }

    let _guard = INITIALIZATION_LOCK
        .lock()
        .map_err(CommandError::internal)?;
    if INITIALIZED.get().is_some() {
        return Ok(());
    }

    configure_store()?;
    let _ = INITIALIZED.set(());
    Ok(())
}

fn ensure_available() -> CommandResult<()> {
    initialize()
}

pub fn save_provider_secret(provider_id: &str, secret: &str) -> CommandResult<()> {
    ensure_available()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))?;
    entry
        .set_password(secret)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
}

pub fn read_provider_secret(provider_id: &str) -> CommandResult<Option<String>> {
    ensure_available()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))?;
    match entry.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(CommandError::with_detail(
            keys::SECURE_STORAGE_UNAVAILABLE,
            error,
        )),
    }
}

pub fn provider_secret(provider_id: &str) -> Option<String> {
    read_provider_secret(provider_id).ok().flatten()
}

pub fn has_provider_secret(provider_id: &str) -> bool {
    provider_secret(provider_id).is_some()
}

pub fn delete_provider_secret(provider_id: &str) -> CommandResult<()> {
    ensure_available()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(CommandError::with_detail(
            keys::SECURE_STORAGE_UNAVAILABLE,
            error,
        )),
    }
}
