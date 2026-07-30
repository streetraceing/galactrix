use std::cell::RefCell;

use crate::i18n::{keys, CommandError, CommandResult};

const SERVICE_NAME: &str = "Galactrix";

thread_local! {
    static INITIALIZATION_ERROR: RefCell<Option<CommandError>> = const { RefCell::new(None) };
}

pub fn initialize() -> CommandResult<()> {
    let result = {
        #[cfg(target_os = "android")]
        {
            let config = keyring::android::AndroidStoreConfig::default();
            keyring::use_android_native_store(&config)
                .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
        }
        #[cfg(not(target_os = "android"))]
        {
            keyring::use_native_store(false)
                .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
        }
    };

    if let Err(error) = &result {
        INITIALIZATION_ERROR.with(|slot| *slot.borrow_mut() = Some(error.clone()));
    } else {
        INITIALIZATION_ERROR.with(|slot| *slot.borrow_mut() = None);
    }
    result
}

fn ensure_available() -> CommandResult<()> {
    match INITIALIZATION_ERROR.with(|slot| slot.borrow().clone()) {
        Some(error) => Err(error),
        None => Ok(()),
    }
}

pub fn save_provider_secret(provider_id: &str, secret: &str) -> CommandResult<()> {
    ensure_available()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))?;
    entry
        .set_password(secret)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
}

pub fn provider_secret(provider_id: &str) -> Option<String> {
    if ensure_available().is_err() {
        return None;
    }
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id).ok()?;
    entry.get_password().ok()
}

pub fn has_provider_secret(provider_id: &str) -> bool {
    provider_secret(provider_id).is_some()
}

pub fn delete_provider_secret(provider_id: &str) -> CommandResult<()> {
    ensure_available()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))?;
    entry
        .delete_credential()
        .map_err(|error| CommandError::with_detail(keys::SECURE_STORAGE_UNAVAILABLE, error))
}
