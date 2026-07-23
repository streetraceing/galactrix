#[cfg(target_os = "android")]
use std::collections::HashMap;

const SERVICE_NAME: &str = "galactrix.ai-provider";

pub fn initialize() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let mut config = HashMap::new();
        config.insert("name", "galactrix");
        keyring::use_android_native_store(&config).map_err(|error| error.to_string())?;
    }

    #[cfg(not(target_os = "android"))]
    {
        keyring::use_native_store(false).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn save_provider_secret(provider_id: &str, secret: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id).map_err(|error| error.to_string())?;
    entry
        .set_password(secret)
        .map_err(|error| error.to_string())
}

pub fn provider_secret(provider_id: &str) -> Option<String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id).ok()?;
    entry.get_password().ok()
}

pub fn has_provider_secret(provider_id: &str) -> bool {
    provider_secret(provider_id).is_some()
}

pub fn delete_provider_secret(provider_id: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id).map_err(|error| error.to_string())?;
    entry
        .delete_credential()
        .map_err(|error| error.to_string())
}
