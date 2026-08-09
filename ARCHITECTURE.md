# Galactrix architecture

The frontend follows one-way dependencies:

1. `src/app` composes screens, owns application state and coordinates side effects.
2. `src/features/<feature>` owns domain models, pure state transformations and feature UI.
3. `src/components` contains reusable presentation and layout components without feature state.
4. `src/lib` contains framework-independent adapters and utilities.
5. `src/i18n` owns locale resolution and translation resources; static catalogs expose typed translation keys and views translate them.

The Rust backend keeps Tauri commands thin and separates infrastructure from domain work:

1. `src-tauri/src/lib.rs` is the application composition root and the stable Tauri command boundary.
2. `runtime.rs` owns shared state and generation cancellation; `generation_context.rs` owns AI-context preparation and resolves per-chat module overrides; `generation_modules.rs` contains pure context/repetition transformations.
3. `db.rs` coordinates persistence, while `db/galaxy.rs`, `db/settings.rs` and `db/ai_memory.rs` own focused storage domains.
4. `provider_client.rs` owns provider operations; endpoint policy and retry/rate-limit transport live in dedicated submodules.
5. `provider_support.rs`, `app_settings.rs` and `prompt_preview.rs` contain testable validation and transformation rules without Tauri state. `prompt_builder.rs` is the single source of truth for deterministic prompt sections and token-economy filtering.

## Conventions

- Keep business transformations pure and test them directly. Components and controllers should coordinate them rather than duplicate them.
- Browser APIs with optional availability, such as local storage and clipboard access, live behind adapters.
- Convert unknown errors with `errorMessage`; backend errors remain structured and are localized at the backend boundary.
- Static navigation, prompt and galaxy catalogs store typed translation keys. Do not call the global i18n instance from configuration objects.
- Application-only hooks belong in `src/app`; reusable browser and interaction hooks belong in `src/hooks`.
- Feature modules may depend on shared components, libraries, i18n and types. Shared layers must not import feature modules.
- AI module parameters live in global settings; chats persist only sparse `inherit / on / off` overrides so new modules do not duplicate settings state.
- Prompt previews have two explicit scopes: Galaxy editors render only the item contribution (plus explicit inherited dependencies), while chat settings render the deterministic model request after recent-message and token-economy limits. Runtime-selected Dynamic Context and Semantic Memory are disclosed instead of fabricated.
- Token economy must preserve semantics before saving size: remove duplicate rules/remembered messages, treat Worldbook keywords as local activation metadata, select relevant Worldbook entries from recent dialogue, compact only framework text, and drop lower-priority system sections before higher-priority ones. CRITICAL sections are never removed by the system prompt target.
- A remembered message is promoted to `[REMEMBERED FACTS]` only after it falls out of the direct history sent to the provider; do not pay for the same message in both places.
- Mobile back-history entries are layered: when nested overlays or interaction modes disappear together, retired entries are skipped before the underlying chat/page can consume Back.
- Motion uses one shared scale: CSS consumes the `--motion-*` tokens from `App.css`, while imperative Web Animations and presence delays consume `src/lib/motion.ts`. Entrances use the enter curve, state changes use the standard curve, exits use the exit curve, and every path must honor both the animation setting and `prefers-reduced-motion`.
- Destructive presence transitions stage affected ids before persistence, keep virtualized measurements stable during the exit, and restore visible state if the backend rejects the mutation.
- Provider API-key pools use round-robin selection for normal requests and per-key cooldowns for 429/exhausted rate-limit responses; key rotation is transport behavior and must not depend on UI retry configuration.
- Context-first multi-selection is shared across Chats, Galaxies and Telescope: the first item enters selection from its context menu, subsequent primary clicks toggle items, and selection state is owned by the current screen/context so it disappears when that context is left.
- Archived chats remain readable but immutable. The frontend hides mutation affordances, while SQLite/Rust guards enforce the same invariant for chat configuration, message mutation, branching/cloning and generation paths.
- Rewinding a chat is destructive history truncation: keep the selected message and every message before it, delete only later messages, then invalidate derived AI context.
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
