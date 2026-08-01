import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const statePath = new URL(
  '../../src/features/chats/chatViewState.ts',
  import.meta.url,
);

test('chat view persistence stores navigation only and drops legacy scroll data', async () => {
  const source = await readFile(statePath, 'utf8');

  assert.match(source, /galactrix-chat-navigation-v1/);
  assert.match(source, /galactrix-chat-view-state-v1/);
  assert.match(source, /removeItem\(LEGACY_CHAT_VIEW_STORAGE_KEY\)/);
  assert.match(source, /activeChatId/);
  assert.match(source, /isChatOpen/);
  assert.doesNotMatch(source, /scrollTop/);
  assert.doesNotMatch(source, /anchorMessageId/);
  assert.doesNotMatch(source, /scrollByChat/);
});
