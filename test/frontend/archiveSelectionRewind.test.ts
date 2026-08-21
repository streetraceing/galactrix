import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('Chats, Galaxies and Telescope share context-first multi-selection', async () => {
  const [
    hook,
    chats,
    chatSidebar,
    galaxies,
    telescope,
    galaxyCard,
    providerCard,
  ] = await Promise.all([
    read('src/hooks/useContextSelection.ts'),
    read('src/features/chats/ChatsScreen.tsx'),
    read('src/features/chats/components/ChatSidebar.tsx'),
    read('src/features/galaxies/GalaxiesScreen.tsx'),
    read('src/features/telescope/TelescopeScreen.tsx'),
    read('src/features/galaxies/components/GalaxyCard.tsx'),
    read('src/features/telescope/components/ProviderCard.tsx'),
  ]);

  assert.match(hook, /export function useContextSelection/);
  for (const screen of [chats, galaxies, telescope]) {
    assert.match(screen, /useContextSelection/);
  }
  for (const screen of [chatSidebar, galaxies, telescope]) {
    assert.match(screen, /ContextSelectionToolbar/);
  }
  assert.match(galaxyCard, /selectionActive \? onToggleSelection : onEdit/);
  assert.match(providerCard, /selectionActive \? onToggleSelection : onEdit/);
  assert.match(galaxyCard, /onStartSelection/);
  assert.match(providerCard, /onStartSelection/);
});

test('Galaxy selection spans all library tabs instead of resetting per section', async () => {
  const source = await read('src/features/galaxies/GalaxiesScreen.tsx');
  assert.match(source, /const itemIds = useMemo\(\(\) => items\.map/);
  assert.match(source, /useContextSelection\(itemIds\)/);
  assert.doesNotMatch(source, /useContextSelection\(visibleByKind\[section\]/);
});

test('archived chats are persisted read-only and can be restored', async () => {
  const [types, db, screen, sidebar, messages] = await Promise.all([
    read('src/types.ts'),
    read('src-tauri/src/db.rs'),
    read('src/features/chats/ChatsScreen.tsx'),
    read('src/features/chats/components/ChatSidebar.tsx'),
    read('src/features/chats/components/MessageList.tsx'),
  ]);

  assert.match(types, /archived: boolean/);
  assert.match(db, /archived INTEGER NOT NULL DEFAULT 0/);
  assert.match(db, /pub fn set_chat_archived/);
  assert.match(db, /CHAT_ARCHIVED_READ_ONLY/);
  assert.match(sidebar, /openArchive/);
  assert.match(sidebar, /ContextSelectionToolbar/);
  assert.match(screen, /canvasChat\.archived/);
  assert.match(screen, /onSetArchived/);
  assert.match(messages, /readOnly/);
});

test('rewind keeps the selected message and deletes only later history', async () => {
  const [menu, backend] = await Promise.all([
    read('src/features/chats/components/MessageList.tsx'),
    read('src-tauri/src/db.rs'),
  ]);

  const branchIndex = menu.indexOf('messageList.branchFromHere');
  const rewindIndex = menu.indexOf('messageList.rewindHere', branchIndex);
  assert.ok(branchIndex >= 0 && rewindIndex > branchIndex);
  assert.match(backend, /pub fn rewind_chat_to_message/);
  assert.match(
    backend,
    /created_at > \?2 OR \(created_at = \?2 AND rowid > \?3\)/,
  );
});
