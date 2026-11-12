# Validation: startup recovery and UI consistency

Version 1.10.4 preserved; no release/version fields or lockfiles changed.

## Passed

- Focused startup/provider tests: 25/25. Five executable startup-helper tests cover ordering, hung jobs, hung snapshots, successful retry, error propagation and timer cleanup; source guards cover latest-attempt handling, resume, protected-storage boundaries and standard UI components. Existing provider regressions remain intact.
- Full npm test: 267 discovered, 264 passed, 3 dependency-load failures. The same three files already could not load in this environment: appArchitecture.test.ts (i18next), designSystemRefactor.test.ts (clsx), recoveryUi.test.ts (@heroui/react). No tests were deleted or skipped.
- npm run i18n:check: 2 locales / 8 namespaces, consistent.
- npm run version:check: npm/Cargo/Tauri synchronized at 1.10.4.
- esbuild syntax/bundle checks with external imports for the controller, startup helper, IPC adapter, advanced settings and provider modal. This is not a full application build or typecheck.
- Edited frontend source formatted with local Prettier.
- Python SQLite executed SQL extracted from db.rs: additive legacy-column migration, true/false presence upserts, retained creation time/settings and conditional reconciliation that cannot overwrite known metadata. This is an SQL smoke test, not execution of Rust code.
- Full ZIP payload hashes, sizes, modes, canonical rootHash, CRCs, input-file retention and unchanged version/package configuration independently checked during packaging.

## Blocked / not verified

- npm run typecheck: TS2688, Node type definitions missing.
- npm run lint: eslint not installed.
- cargo fmt --check, cargo test, cargo clippy --all-targets -- -D warnings: cargo not installed. The new Rust metadata roundtrip/migration test was added but NOT executed. Rust compilation is NOT claimed to pass.
- HeroUI CLI documentation command: unavailable. Official Select documentation and existing project components were used instead.
- Android native build, runtime rendering, 360px/large-font layouts and keyboard interactions require a dependency-complete build/device. No visual-rendering or live-provider compatibility claim is made.
- No npm install, curl or wget, package hooks, dependency changes or version mutators were run.
- Package CLI check/apply --dry-run is not available here; custom archive verification does not substitute for its official check.

## Maintainer/device gate

Run cargo fmt, npm run test:rust, npm run typecheck, npm run lint and npm test with project dependencies installed. On Android check: force-stop/cold launch; first launch after reboot; screen off for at least 30 minutes followed by resume; repeated close/open; legacy saved keys; adding/clearing a key; model/protocol/preset selections; embedding-only configuration; invalid numeric/JSON drafts; 360px and large-font modal layout with the keyboard. Confirm existing keys remain usable and that a failed startup can recover using Retry. If the freeze remains, capture logcat from before launch, distinguishing a native/pre-WebView stall from a visible loading screen/IPC timeout.
