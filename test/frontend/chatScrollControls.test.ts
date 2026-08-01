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

test('virtual scrolling updates only bounded message windows', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /messageVirtualRange\(/);
  assert.match(source, /buildMessageOffsets\(/);
  assert.match(source, /topVirtualSpacerHeight/);
  assert.match(source, /bottomVirtualSpacerHeight/);
  assert.match(source, /chat-message-virtual-spacer/);
  assert.match(source, /data-virtual-message-id/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /MESSAGE_VIRTUALIZATION_THRESHOLD/);
  assert.match(source, /const \[virtualWindow, setVirtualWindow\]/);
  assert.match(source, /startTransition\(syncVirtualWindow\)/);
  assert.match(source, /setVirtualBufferReady\(true\)/);
  assert.match(source, /MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX/);
  assert.match(source, /commitMeasuredMessageHeights/);
  assert.match(source, /shouldForceBottom/);
  assert.match(source, /previous\.sending !== sending/);
  assert.match(source, /previous\.generationKey !== generationKey/);
  assert.match(source, /keepVirtualTailMounted/);
  assert.match(source, /current\.start === next\.start/);
  assert.match(source, /current\.end === next\.end/);
  assert.doesNotMatch(source, /setVirtualViewport/);
  assert.doesNotMatch(source, /scrollTop \+= scrollAdjustment/);
  assert.doesNotMatch(source, /loadEarlierMessages/);
});

test('regeneration uses the same symmetric typing bubble as a new response', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(
    source,
    /isRegenerating[\s\S]*width: '2\.75rem'[\s\S]*maxWidth: '2\.75rem'/,
  );
  assert.doesNotMatch(
    source,
    /className="flex h-5 min-w-12 items-center gap-1"/,
  );
});
