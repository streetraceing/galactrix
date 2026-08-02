# Galactrix architecture

The frontend follows one-way dependencies:

1. `src/app` composes screens, owns application state and coordinates side effects.
2. `src/features/<feature>` owns domain models, pure state transformations and feature UI.
3. `src/components` contains reusable presentation and layout components without feature state.
4. `src/lib` contains framework-independent adapters and utilities.
5. `src/i18n` owns locale resolution and translation resources; static catalogs expose typed translation keys and views translate them.

## Conventions

- Keep business transformations pure and test them directly. Components and controllers should coordinate them rather than duplicate them.
- Browser APIs with optional availability, such as local storage and clipboard access, live behind adapters.
- Convert unknown errors with `errorMessage`; backend errors remain structured and are localized at the backend boundary.
- Static navigation, prompt and galaxy catalogs store typed translation keys. Do not call the global i18n instance from configuration objects.
- Application-only hooks belong in `src/app`; reusable browser and interaction hooks belong in `src/hooks`.
- Feature modules may depend on shared components, libraries, i18n and types. Shared layers must not import feature modules.
- Add a regression test whenever state reconciliation, persistence or a cross-layer contract changes.

## Required checks

Run formatting for edited files, then:

```text
npm run i18n:check
npm test
npm run typecheck
npm run lint
```
