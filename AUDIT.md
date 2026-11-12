# Startup recovery and provider UI patch

Input application version: 1.10.4, unchanged.

## Findings and changes

- Startup synchronously initialized secure storage during native setup and read every provider key while holding the SQLite mutex in get_app_snapshot. Cold/idle Android keystore latency could therefore block startup. This is an identified blocking path, not a device-confirmed diagnosis of every reported hang.
- Native setup no longer initializes the keyring. Snapshot reads run in a blocking worker, contain no keyring calls and use cached non-secret credential-presence metadata.
- An additive nullable providers.has_secret column preserves legacy data. New saves persist known presence. Legacy unknown entries are reconciled after the initial frame in a separate worker, with keyring access outside the DB lock. Errors remain unknown rather than being written as false. A single-flight guard prevents accumulating workers on retries; conditional writes avoid overwriting a concurrent save. Actual credentials remain exclusively in protected storage.
- Frontend startup keeps jobs-before-snapshot ordering, applies results only for the latest attempt and has a 15-second deadline. It reuses the existing localized error/retry screen instead of spinning forever. Late responses and unmounted/StrictMode attempts cannot replace the current startup state. Returning to the app retries a stale or failed startup, but does not reset a healthy session or its drafts.
- Deferred presence replies only update unchanged provider objects from that startup attempt; they cannot overwrite a subsequently saved/refreshed connection.
- Advanced provider settings now reuse HeroUI Select/ListBox, the project's SettingSwitchRow, AppPanel and SectionHeader. Bespoke native dropdowns, checkbox styling and nested custom details were removed. All additional connection parameters sit under the editor's existing advanced section. Numeric drafts, JSON validation, stop-sequence updates, preset application and independent embedding controls are preserved.
- TODO-026 now records that the earlier implementation shipped in 1.10.4, without falsely marking outstanding device/service verification complete.

## Important limits

No Android device or native compiler is available here. The cold-start/screen-off symptom has not been reproduced or certified fixed on hardware. Startup deadlines cover frontend IPC waits; a native failure before the WebView/JavaScript starts still requires Android logs. Android TLS/NDK context initialization and the keyboard overlay policy were intentionally left unchanged. See VALIDATION.md for exact checks and remaining gates.
