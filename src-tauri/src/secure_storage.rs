#[cfg(target_os = "android")]
use std::collections::HashMap;

const SERVICE_NAME: &str = "galactrix.ai-provider";

/// Selects a platform-specific protected credential store.
///
/// Desktop uses the native OS credential manager. Android uses encrypted
/// SharedPreferences whose encryption key is kept in Android Keystore.
pub fn initialize() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let mut config = HashMap::new();
        config.insert("name", "galactrix");
        keyring::use_android_native_store(&config).map_err(|error| error.to_string())?;
    }

    #[cfg(not(target_os = "android"))]
    {
        // On Linux, false prefers kernel keyutils. Change to true if the app
        // should prefer Secret Service instead.
        keyring::use_native_store(false).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn save_provider_secret(provider_id: &str, secret: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| error.to_string())?;
    entry.set_password(secret).map_err(|error| error.to_string())
}

#[allow(dead_code)]
pub fn get_provider_secret(provider_id: &str) -> Result<String, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| error.to_string())?;
    entry.get_password().map_err(|error| error.to_string())
}

#[allow(dead_code)]
pub fn delete_provider_secret(provider_id: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|error| error.to_string())?;
    entry.delete_credential().map_err(|error| error.to_string())
}
