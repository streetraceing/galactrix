# Galactrix architecture

The frontend follows one-way dependencies:

1. `src/app` composes screens, owns application state and coordinates side effects.
2. `src/features/<feature>` owns domain models, pure state transformations and feature UI.
3. `src/components` contains reusable presentation and layout components without feature state.
4. `src/lib` contains framework-independent adapters and utilities.
5. `src/i18n` owns locale resolution and translation resources; static catalogs expose typed translation keys and views translate them.

The Rust backend keeps Tauri commands thin and separates infrastructure from domain work:

1. `src-tauri/src/lib.rs` is the application composition root and the stable Tauri command boundary.
2. `runtime.rs` owns shared state and generation cancellation; `generation_context.rs` owns AI-context preparation.
3. `db.rs` coordinates persistence, while `db/galaxy.rs`, `db/settings.rs` and `db/ai_memory.rs` own focused storage domains.
4. `provider_client.rs` owns provider operations; endpoint policy and retry/rate-limit transport live in dedicated submodules.
5. `provider_support.rs`, `app_settings.rs` and `prompt_preview.rs` contain testable validation and transformation rules without Tauri state.

## Conventions

- Keep business transformations pure and test them directly. Components and controllers should coordinate them rather than duplicate them.
- Browser APIs with optional availability, such as local storage and clipboard access, live behind adapters.
- Convert unknown errors with `errorMessage`; backend errors remain structured and are localized at the backend boundary.
- Static navigation, prompt and galaxy catalogs store typed translation keys. Do not call the global i18n instance from configuration objects.
- Application-only hooks belong in `src/app`; reusable browser and interaction hooks belong in `src/hooks`.
- Feature modules may depend on shared components, libraries, i18n and types. Shared layers must not import feature modules.
- Add a regression test whenever state reconciliation, persistence or a cross-layer contract changes.
- Keep Tauri command names and serialized camelCase contracts stable; move implementation behind them instead of coupling domain modules to Tauri.
- Keep SQLite transactions inside the storage domain that owns the invariant. Cross-domain orchestration belongs above `db`.
- Return structured `CommandError` translation keys from Rust. User-facing text is resolved by the frontend i18n boundary.

## Required checks

Run formatting for edited files, then:

```text
npm run i18n:check
npm test
npm run typecheck
npm run lint
```

For Rust changes also run:

```text
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```
