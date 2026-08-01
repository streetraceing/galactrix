import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);

test('long chats expose a stable scroll-to-bottom affordance', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /const showThreshold = Math\.max\(240,/);
  assert.match(source, /const hideThreshold = Math\.max\(120,/);
  assert.match(source, /scrollingToBottomRef\.current/);
  assert.match(source, /SCROLL_TO_BOTTOM_RELEASE_MS/);
  assert.match(source, /onScroll=\{handleMessageScroll\}/);
  assert.match(source, /messageList\.scrollToBottom/);
  assert.match(
    source,
    /scroller\.scrollTo\(\{[\s\S]*top: scroller\.scrollHeight/,
  );
});

test('older chat messages load in bounded windows near the top', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /AUTO_LOAD_EARLIER_THRESHOLD/);
  assert.match(source, /loadEarlierMessages\(\)/);
  assert.match(source, /loadingEarlierRef\.current/);
  assert.match(source, /loadEarlierSentinelRef/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /chat-message-virtual-item/);
});
