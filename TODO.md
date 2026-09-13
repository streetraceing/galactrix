# Project TODO

This file is the canonical backlog for product improvements. The planning baseline is **v1.9.0**.

## How to use this file

- Keep backlog items in priority order and preserve their stable `TODO-NNN` identifiers.
- Add enough detail to describe the user outcome, not a speculative implementation.
- When work ships, move the item to `Completed` and format it as:
  `- [x] ~~TODO-NNN - Original item text.~~ - Implemented in vX.Y.Z`
- Do not complete an item until the implementation and relevant checks are finished and the release version is known.

## Now

- [ ] **TODO-019 - Add message-level translation.** Let users translate any received message into the interface language or a chosen target language via the message menu, showing the translation alongside the original with a clear "translated" badge and a copy action.
- [ ] **TODO-021 - Add quick prompt templates for common edits.** Offer built-in one-tap actions in the message menu (shorten, expand, fix grammar, translate) that regenerate or edit the selected message with a prompt template.

## Completed

- [x] ~~**TODO-020 - Add chat statistics.** Show per-chat statistics (message counts by role, tokens, average response latency, most active days) in the chat settings or a dedicated panel, reusing the existing usage aggregation.~~ - Implemented in v1.10.0
- [x] ~~**TODO-018 - Add backup reminders.** Nudge users to export a full backup after a week or a set number of new messages, with a one-tap export action and a snooze option, so local-only data stays recoverable.~~ - Implemented in v1.10.0
- [x] ~~**TODO-017 - Add find-in-chat with highlighted matches.** Search inside the open conversation with match highlighting, next/previous navigation and a match counter, complementing the cross-chat search in the sidebar.~~ - Implemented in v1.10.0
- [x] ~~**TODO-016 - Add provider fallback chains.** Let users group providers into an ordered fallback list per chat so a failed or rate-limited request automatically retries the next connection, with the active provider and failure reason visible in the response inspector.~~ - Implemented in v1.9.0
- [x] ~~**TODO-015 - Reuse variant feedback when tuning characters and styles.** Surface rated and annotated response variants as tuning hints when editing a character, style or prompt set, so winning responses can shape future generation instead of staying isolated in one chat.~~ - Implemented in v1.9.0
- [x] ~~**TODO-014 - Add reusable composer snippets.** Let users save frequently used prompts as named snippets and insert them into the composer from a picker, with editing and reordering in settings.~~ - Implemented in v1.8.0
- [x] ~~**TODO-013 - Add usage budgets and alerts.** Let users set per-provider or global token and request budgets per day or month, show progress against them in usage statistics, and warn before costs run away.~~ - Implemented in v1.8.0
- [x] ~~**TODO-012 - Export a single chat.** Share or save one conversation as Markdown or JSON (optionally with variants and metadata), complementing the full-app backup with a lightweight per-chat flow.~~ - Implemented in v1.8.0
- [x] ~~**TODO-011 - Stream responses token by token.** Render provider replies incrementally as they arrive instead of waiting for the full completion, keep cancellation working on partial text, and fall back to the current behavior when a provider cannot stream.~~ - Implemented in v1.8.0
- [x] ~~**TODO-010 - Add a first-run setup and health wizard.** Guide users through locale and profile setup, provider connection, model selection, optional embeddings, and actionable diagnostics when configuration is incomplete.~~ - Implemented in v1.8.0
- [x] ~~**TODO-009 - Complete an accessibility quality pass.** Cover keyboard-only navigation, focus restoration, screen-reader names, contrast, reduced motion, scalable text, and touch targets with repeatable automated and manual checks.~~ - Implemented in v1.7.0
- [x] ~~**TODO-008 - Add revision history and undo for long-form editors.** Autosave recoverable revisions for messages, character definitions, styles, worldbooks, and prompt sets, with clear restore and conflict behavior.~~ - Implemented in v1.7.0
- [x] ~~**TODO-007 - Improve response variant comparison.** Let users compare variants side by side, annotate or rate them, promote one without losing alternatives~~ (feedback reuse split into TODO-015) - Implemented in v1.7.0
- [x] ~~**TODO-006 - Explain context and usage per response.** Show estimated and reported tokens, included and omitted context sections, active prompt rules, truncation reasons, latency, and provider usage in a readable message-level inspector.~~ - Implemented in v1.6.0
- [x] ~~**TODO-005 - Add chat organization beyond pin and archive.** Support folders or tags, bulk assignment, and saved smart collections such as unread, recently active, character, provider, and generation status.~~ - Implemented in v1.5.1
- [x] ~~**TODO-004 - Add a data health and recovery center.** Provide database integrity checks, orphan cleanup, a safe repair flow, and an exportable diagnostics report without exposing provider secrets or message content by default.~~ - Implemented in v1.5.1
- [x] ~~**TODO-001 - Add versioned full-app backup and restore.** Export chats, message variants, Galaxy objects, settings, and optional provider credentials in one validated archive; preview its contents and roll back cleanly if import fails.~~ - Implemented in v1.4.0
- [x] ~~**TODO-002 - Make generation jobs durable and chat-scoped.** Allow responses to continue safely while the user navigates between chats, show a compact global job queue, support cancellation per chat, and recover interrupted UI state without duplicate placeholders.~~ - Implemented in v1.4.0
- [x] ~~**TODO-003 - Establish a long-conversation performance budget.** Add measured message virtualization and automated stress scenarios for large chats while preserving the exact scroll anchor during pagination, edits, image loading, keyboard resize, and generation.~~ - Implemented in v1.4.1

## Dropped

No roadmap items have been dropped.
