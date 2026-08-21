# Project TODO

This file is the canonical backlog for product improvements. The planning baseline is **v1.4.0**.

## How to use this file

- Keep backlog items in priority order and preserve their stable `TODO-NNN` identifiers.
- Add enough detail to describe the user outcome, not a speculative implementation.
- When work ships, move the item to `Completed` and format it as:
  `- [x] ~~TODO-NNN - Original item text.~~ - Implemented in vX.Y.Z`
- Do not complete an item until the implementation and relevant checks are finished and the release version is known.

## Now

- [ ] **TODO-003 - Establish a long-conversation performance budget.** Add measured message virtualization and automated stress scenarios for large chats while preserving the exact scroll anchor during pagination, edits, image loading, keyboard resize, and generation.
- [ ] **TODO-004 - Add a data health and recovery center.** Provide database integrity checks, orphan cleanup, a safe repair flow, and an exportable diagnostics report without exposing provider secrets or message content by default.
- [ ] **TODO-005 - Add chat organization beyond pin and archive.** Support folders or tags, bulk assignment, and saved smart collections such as unread, recently active, character, provider, and generation status.

## Next

- [ ] **TODO-006 - Explain context and usage per response.** Show estimated and reported tokens, included and omitted context sections, active prompt rules, truncation reasons, latency, and provider usage in a readable message-level inspector.
- [ ] **TODO-007 - Improve response variant comparison.** Let users compare variants side by side, annotate or rate them, promote one without losing alternatives, and optionally reuse feedback when tuning character or chat styles.
- [ ] **TODO-008 - Add revision history and undo for long-form editors.** Autosave recoverable revisions for messages, character definitions, styles, worldbooks, and prompt sets, with clear restore and conflict behavior.
- [ ] **TODO-009 - Complete an accessibility quality pass.** Cover keyboard-only navigation, focus restoration, screen-reader names, contrast, reduced motion, scalable text, and touch targets with repeatable automated and manual checks.
- [ ] **TODO-010 - Add a first-run setup and health wizard.** Guide users through locale and profile setup, provider connection, model selection, optional embeddings, a test response, and actionable diagnostics when configuration is incomplete.

## Completed

- [x] ~~**TODO-001 - Add versioned full-app backup and restore.** Export chats, message variants, Galaxy objects, settings, and optional provider credentials in one validated archive; preview its contents and roll back cleanly if import fails.~~ - Implemented in v1.4.0
- [x] ~~**TODO-002 - Make generation jobs durable and chat-scoped.** Allow responses to continue safely while the user navigates between chats, show a compact global job queue, support cancellation per chat, and recover interrupted UI state without duplicate placeholders.~~ - Implemented in v1.4.0

## Dropped

No roadmap items have been dropped.
