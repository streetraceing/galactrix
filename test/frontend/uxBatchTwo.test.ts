import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  consumeChatQuickCreate,
  requestChatQuickCreate,
} from '../../src/lib/chatQuickCreate.ts';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('prompt token chips wrap on narrow cards instead of overflowing', async () => {
  const source = await read('src/components/ui/PromptPreviewCard.tsx');
  assert.match(source, /flex min-w-0 flex-1 flex-wrap gap-2/);
  assert.match(source, /tokensSavedPercent/);
  assert.match(source, /max-w-full whitespace-normal/);
  assert.match(source, /whitespace-normal text-center leading-4/);
});

test('message deletion previews preserve full text inside a scrollable modal', async () => {
  const source = await read('src/features/chats/components/MessageList.tsx');
  assert.match(source, /max-h-\[min\(55dvh,30rem\)\]/);
  assert.match(source, /selectable whitespace-pre-wrap wrap-break-word/);
  assert.doesNotMatch(source, /line-clamp-2 rounded-xl bg-default\/60/);
  assert.doesNotMatch(source, /line-clamp-6 text-sm leading-6 text-muted/);
});

test('nested mobile back entries skip retired layers instead of closing the chat', async () => {
  const source = await read('src/hooks/useMobileBackEntry.ts');
  assert.match(source, /const retiredEntries = new Set<string>\(\)/);
  assert.match(source, /removeRetiredEntryIfNeeded/);
  assert.match(
    source,
    /Multiple nested layers may disappear in one React commit/,
  );
  assert.match(source, /activeEntries\.delete\(entryId\)/);
});

test('chat quick create can preselect a character and survives screen navigation', async () => {
  requestChatQuickCreate('character-42');
  assert.deepEqual(consumeChatQuickCreate(), { characterId: 'character-42' });
  assert.equal(consumeChatQuickCreate(), null);

  const [sidebar, screen, setup, titlebar] = await Promise.all([
    read('src/features/chats/components/ChatSidebar.tsx'),
    read('src/features/chats/ChatsScreen.tsx'),
    read('src/features/chats/components/ChatSetupModal.tsx'),
    read('src/components/layout/DesktopTitlebar.tsx'),
  ]);
  assert.match(sidebar, /<Dropdown>/);
  assert.match(sidebar, /characters\.map/);
  assert.match(screen, /consumeChatQuickCreate/);
  assert.match(screen, /subscribeChatQuickCreate/);
  assert.match(setup, /initialCharacterId/);
  assert.match(titlebar, /requestChatQuickCreate\(\)/);
});

test('provider keys are round-robin selected before rate limits are hit', async () => {
  const [retry, credentials] = await Promise.all([
    read('src-tauri/src/provider_client/retry.rs'),
    read('src/i18n/locales/en/telescope.json'),
  ]);
  assert.match(retry, /next_index: usize/);
  assert.match(retry, /select_available_key/);
  assert.match(retry, /pool\.next_index = \(index \+ 1\) % keys\.len\(\)/);
  assert.match(retry, /status == 429/);
  assert.match(credentials, /round-robin/);
});
