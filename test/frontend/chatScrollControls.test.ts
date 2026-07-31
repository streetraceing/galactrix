import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);

test('long chats expose a bounded scroll-to-bottom affordance', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /distanceFromBottom > Math\.max\(240,/);
  assert.match(source, /onScroll=\{updateScrollToBottomVisibility\}/);
  assert.match(source, /messageList\.scrollToBottom/);
  assert.match(
    source,
    /scroller\.scrollTo\(\{[\s\S]*top: scroller\.scrollHeight/,
  );
});
