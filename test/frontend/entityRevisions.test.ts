import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('revisions are recorded automatically and restores are themselves undoable', async () => {
  const [revisions, db, galaxy, lib, backend, controller, router] =
    await Promise.all([
      read('src-tauri/src/db/revisions.rs'),
      read('src-tauri/src/db.rs'),
      read('src-tauri/src/db/galaxy.rs'),
      read('src-tauri/src/lib.rs'),
      read('src/lib/backend.ts'),
      read('src/app/useAppController.ts'),
      read('src/app/AppScreenRouter.tsx'),
    ]);

  assert.match(db, /CREATE TABLE IF NOT EXISTS entity_revisions/);
  assert.match(db, /revisions::prune_orphan_revisions\(&connection\)/);
  assert.match(
    db,
    /revisions::record_revision\(\s*connection,\s*revisions::KIND_MESSAGE/,
  );
  assert.match(
    galaxy,
    /record_revision\(\s*connection,\s*super::revisions::KIND_GALAXY/,
  );
  // Restores snapshot the replaced state first, so they can be undone.
  assert.match(revisions, /"restore"/);
  assert.match(revisions, /MAX_REVISIONS_PER_ENTITY: i64 = 20/);
  // Assistant history lives in variants; a direct restore must not fight it.
  assert.match(revisions, /MESSAGE_VARIANTS_ASSISTANT_ONLY/);
  assert.match(lib, /fn list_entity_revisions/);
  assert.match(lib, /fn restore_entity_revision/);
  assert.match(
    backend,
    /invokeBackend<EntityRevision\[\]>\('list_entity_revisions'/,
  );
  assert.match(
    backend,
    /invokeBackend<EntityRestoreResult>\('restore_entity_revision'/,
  );
  assert.match(controller, /restoreGalaxyRevision/);
  assert.match(controller, /restoreMessageRevision/);
  assert.match(
    router,
    /onRestoreRevision=\{controller\.restoreGalaxyRevision\}/,
  );
  assert.match(
    router,
    /onRestoreMessageRevision=\{controller\.restoreMessageRevision\}/,
  );
});

test('revision surfaces are readable on phones and guarded against misuse', async () => {
  const [list, editor, messageList, modal] = await Promise.all([
    read('src/components/ui/EntityRevisionsList.tsx'),
    read('src/features/galaxies/components/GalaxyEditorModal.tsx'),
    read('src/features/chats/components/MessageList.tsx'),
    read('src/features/chats/components/MessageRevisionsModal.tsx'),
  ]);

  // Actions are full width on phones, inline confirm uses a readable tint.
  assert.match(list, /className="mt-2 w-full sm:w-auto"/);
  assert.match(list, /border-warning\/35 bg-warning\/10 p-2\.5/);
  assert.doesNotMatch(list, /warning-foreground|success-foreground/);
  // The list host caps its height so the modal never overflows keyboards.
  assert.match(modal, /max-h-\[min\(60dvh,36rem\)\] overflow-y-auto/);
  // History only applies to existing items and edited non-assistant messages.
  assert.match(editor, /editing && onListRevisions/);
  assert.match(messageList, /!\s?isAssistant && message\.edited/);
});
