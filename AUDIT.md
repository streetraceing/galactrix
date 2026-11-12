# Generation failure UX patch

Input: supplied galactrix.zip, application version 1.10.4. Version unchanged.

## Implemented

- Failed send/regenerate/continue operations now create a persistent, chat-scoped notice instead of relying on a short-lived generic toast. One latest failure per chat is retained in controller memory, up to 50 chats, across screen/chat navigation. It is dismissed explicitly or cleared by a new generation. Diagnostics are not persisted to disk or telemetry and do not survive a process restart.
- Errors have concise localized explanations for API credentials, forbidden access, balance/quota, request limits, network/timeout, provider service failure, context size, incompatible settings, model/API routing and empty output. HTTP status is taken from structured error data or an explicit HTTP marker, not unrelated numeric text. Unknown failures are not invented into a definite cause.
- Existing HeroUI Alert/Button and shared UiModal are reused. The notice offers retry where safe, chat settings, technical details and dismissal. Long details open in a bounded shared modal, render as plain text, wrap on narrow screens and can be copied explicitly. The notice itself is scroll-bounded, preserving room for messages/composer with the keyboard. No new overlay/menu framework or bespoke dropdown was introduced.
- Diagnostics extract JSON error message/type/code instead of dumping arbitrary response/request fields; omit HTML pages, redact common key/header/URL credentials and cap retained text. Redaction is best-effort; the UI asks users to review before sharing. No diagnostics are automatically copied or sent anywhere.
- Cancellation does not create a failure notice. Already-reported generation errors do not also produce duplicate disappearing toasts. Background failures remain attached to their originating chat and produce a short generic notification.
- Retry preserves the operation and any custom regeneration instruction. Regenerate/continue target an existing assistant message. A send retry uses the existing latest user turn and a fresh assistant id; it does not create a second user row or misuse assistant-only regeneration for a user message. Native send accepts an optional retryUserMessage flag; the DB validator rejects changed, missing, cross-chat, archived or non-tail turns without writing history. Existing normal sends retain their previous path.
- Retry guards prevent double-click submissions, disable unavailable/archived/running targets and avoid automatic retry after an unsuccessful state refresh. Failed send placeholders are removed if reconciliation itself fails. The original structured error/persistence marker is preserved so composer draft recovery still works.
- Added 12 frontend error/retry/privacy/UI regression tests and a Rust DB validation test. Updated the optimistic-id source guard to require reusing the persisted id on retry while allocating a new id for normal sends. No tests were deleted or skipped.

## Limits

See VALIDATION.md. Rust compilation, full frontend build and device rendering are not certified. Classification is provider-independent and heuristic where the backend gives only text; unknown errors retain a generic explanation. This patch does not add persistent error history or change provider retry/backoff policy, stream persistence, fallback behavior or token accounting. Partial-stream persistence semantics remain those of the supplied backend.
