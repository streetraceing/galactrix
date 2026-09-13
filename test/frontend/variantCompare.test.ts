import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('variant feedback persists per variant through the command boundary', async () => {
  const [db, lib, backend, controller, router] = await Promise.all([
    read('src-tauri/src/db.rs'),
    read('src-tauri/src/lib.rs'),
    read('src/lib/backend.ts'),
    read('src/app/useAppController.ts'),
    read('src/app/AppScreenRouter.tsx'),
  ]);

  assert.match(db, /pub fn set_variant_feedback/);
  assert.match(db, /ensure_column\(connection, "message_variants", "rating"/);
  assert.match(db, /ensure_column\(connection, "message_variants", "note"/);
  assert.match(db, /ensure_message_chat_mutable\(connection, message_id\)/);
  assert.match(lib, /fn rate_message_variant/);
  assert.match(
    lib,
    /rate_message_variant,\s*\n\s*list_entity_revisions,\s*\n\s*list_variant_feedback,\s*\n\s*restore_entity_revision,\s*\n\s*preview_prompt/,
  );
  assert.match(backend, /invokeBackend<void>\('rate_message_variant'/);
  assert.match(controller, /rateMessageVariantFeedback/);
  assert.match(
    router,
    /onRateMessageVariant=\{controller\.rateMessageVariantFeedback\}/,
  );
});

test('the compare modal stays usable on phones', async () => {
  const [modal, messageList, types, backup] = await Promise.all([
    read('src/features/chats/components/VariantCompareModal.tsx'),
    read('src/features/chats/components/MessageList.tsx'),
    read('src/types.ts'),
    read('src-tauri/src/db/backup.rs'),
  ]);

  // Stacked panes on phones, side by side only from sm: upwards.
  assert.match(modal, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  // Star targets are large enough for touch input.
  assert.match(modal, /rounded-lg p-2 outline-none/);
  // Promoting keeps the alternatives: it maps to the existing variant select.
  assert.match(modal, /onPromote/);
  assert.match(messageList, /VariantCompareModal\s+message=\{compareMessage\}/);
  assert.match(messageList, /message\.variants\.length >= 2/);
  assert.match(types, /rating\?: number;\s*\n\s*note\?: string;/);
  // Feedback survives the backup round-trip with range validation.
  assert.match(backup, /variant\.rating,\s*\n\s*variant\.note,/);
  assert.match(backup, /\(0\.\.=5\)\.contains\(&rating\)/);
});
