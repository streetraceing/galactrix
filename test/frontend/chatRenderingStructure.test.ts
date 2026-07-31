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
const appCssPath = new URL('../../src/App.css', import.meta.url);

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

test('chat scroller always reserves the native scrollbar width', async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(messageListPath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);
  const scrollerRule = cssSource.match(
    /\.chat-message-scroller\s*\{[\s\S]*?\}/,
  )?.[0];

  assert.ok(scrollerRule, 'chat-message-scroller styles must exist');
  assert.match(componentSource, /overflow-y-scroll/);
  assert.doesNotMatch(
    componentSource,
    /chat-message-scroller[^"']*overflow-y-auto/,
  );
  assert.match(scrollerRule, /overflow-y:\s*scroll;/);
  assert.match(
    cssSource,
    /\.chat-message-scroller::-webkit-scrollbar\s*\{[\s\S]*?width:\s*8px;/,
  );
});
