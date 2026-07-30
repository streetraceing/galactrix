import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const chatsScreenPath = new URL(
  '../../src/features/chats/ChatsScreen.tsx',
  import.meta.url,
);
const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);

test('chat switching keeps one stable scroll container', async () => {
  const source = await readFile(chatsScreenPath, 'utf8');
  const messageListOpening = source.match(/<MessageList[\s\S]*?\/>/)?.[0];

  assert.ok(messageListOpening, 'MessageList render must exist');
  assert.doesNotMatch(
    messageListOpening,
    /key=\{activeChat\.id\}/,
    'keying the scroll component by chat remounts the native WebView scrollbar',
  );
});

test('only the message canvas is replaced for a different chat', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /data-chat-id=\{chatId\}/);
  assert.match(source, /key=\{chatId\}[\s\S]*chat-message-canvas/);
  assert.doesNotMatch(source, /onScroll=\{handleScroll\}/);
});
