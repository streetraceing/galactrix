#[cfg(target_os = "android")]
use std::collections::HashMap;
use std::sync::OnceLock;

const SERVICE_NAME: &str = "galactrix.ai-provider";
static INITIALIZATION_ERROR: OnceLock<String> = OnceLock::new();

pub fn initialize() -> Result<(), String> {
    let result = {
        #[cfg(target_os = "android")]
        {
            let mut config = HashMap::new();
            config.insert("name", "galactrix");
            keyring::use_android_native_store(&config).map_err(|error| error.to_string())
        }

        #[cfg(not(target_os = "android"))]
        {
            keyring::use_native_store(false).map_err(|error| error.to_string())
        }
    };

    if let Err(error) = &result {
        let _ = INITIALIZATION_ERROR.set(error.clone());
    }

    result
}

fn ensure_available() -> Result<(), String> {
    match INITIALIZATION_ERROR.get() {
        Some(error) => Err(format!("Защищённое хранилище недоступно: {error}")),
        None => Ok(()),
    }
}

pub fn save_provider_secret(provider_id: &str, secret: &str) -> Result<(), String> {
    ensure_available()?;
    let entry =
        keyring::Entry::new(SERVICE_NAME, provider_id).map_err(|error| error.to_string())?;
    entry
        .set_password(secret)
        .map_err(|error| error.to_string())
}

pub fn provider_secret(provider_id: &str) -> Option<String> {
    ensure_available().ok()?;
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id).ok()?;
    entry.get_password().ok()
}

pub fn has_provider_secret(provider_id: &str) -> bool {
    provider_secret(provider_id).is_some()
}

pub fn delete_provider_secret(provider_id: &str) -> Result<(), String> {
    ensure_available()?;
    let entry =
        keyring::Entry::new(SERVICE_NAME, provider_id).map_err(|error| error.to_string())?;
    entry.delete_credential().map_err(|error| error.to_string())
}
