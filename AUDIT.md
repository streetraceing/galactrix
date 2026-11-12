# Provider reliability fixes

This patch addresses the findings from the source audit against the supplied snapshot. App version remains 1.10.3.

## Implemented

1. Editor session and edit-revision guards reject late credentials, model lists, embedding probes and save results after edits, switching connections, closing or unmounting. Changing fields/keys clears the old probe. Pending credential loads cannot overwrite newly typed credentials.
2. No-auth connections bypass keyring lookup and required-key validation consistently, including save-time connection probes and runtime generation.
3. Untouched credentials are omitted and preserved; explicitly edited empty credentials are sent through IPC as an empty string and delete the keyring entry. The three IPC adapters use nullish rather than truthy fallback. Secure-storage mutations happen before SQL persistence, with best-effort restoration if persistence fails.
4. Legacy Ollama /api/embeddings batches issue one prompt request per input; aggregate vectors are checked for matching dimensions. /api/embed continues using native batches.
5. The model-list endpoint respects modelsPath for Ollama and other providers. Cloudflare uses its native catalog only with its default configuration; a gateway Base URL and custom path are honored. Responses accept native and compatible model envelopes.
6. Explicit embedding dimensions are included in both native Ollama and compatible requests. Older servers/models may reject unsupported dimensions; this is not silently ignored.
7. Embedding connection tests use embedding-specific validation and do not require a chat model or valid chat sampling defaults.
8. Stop sequences update form state on change, so Ctrl/Cmd+Enter cannot save the previous value. Numeric fields use editable text drafts, preserving partial negative/decimal values while blocking invalid saves.
9. Vector identity includes embedding model/endpoint/protocol/dimensions/embedding JSON and transport context, not generation reasoning, sampling overrides or stops. Generation-only option edits no longer clear the vector index.
10. A nested-safe SQLite savepoint covers index invalidation and provider upsert. Failure rolls back both. Corrupt stored provider options raise a read error instead of silently falling back to defaults.
11. Added executable asynchronous epoch tests, source contract regressions and Rust tests for auth policy, routing, dimension requests, vector identity, rollback, nested transactions and corrupt options.

## Rust diagnostic

The supplied archive already declares provider_support in lib.rs and uses crate::provider_support::validate_options. This correct path is retained. The repeated editor screenshot is not proof of an unresolved import in a fresh Cargo build. Run npm run test:rust on the maintainer machine; if it succeeds but the editor still shows E0433, restart Rust Analyzer and check the active workspace checkout. Rust compilation was not available in this environment.

## Remaining verification gates

See VALIDATION.md. Real API calls, rendering and Android/iOS keyboard QA are not verified. Optional generation parameters remain model-specific. This is a source patch, not a claim that every project defect has been eliminated or that live compatibility has been certified. Atomicity is guaranteed by the SQL savepoint only within SQLite; OS-keyring compensation remains best-effort because it is a separate storage system.
