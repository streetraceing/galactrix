import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);
const composerPath = new URL(
  '../../src/features/chats/components/ChatComposer.tsx',
  import.meta.url,
);
const chatsScreenPath = new URL(
  '../../src/features/chats/ChatsScreen.tsx',
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
  assert.match(source, /chat-message-virtual-stage/);
  assert.match(source, /height: totalVirtualHeight/);
  assert.match(source, /chat-message-virtual-window/);
  assert.match(source, /messageOffsets\[visibleStart\]/);
  assert.match(source, /top: messageOffsets\[visibleStart\] \?\? 0/);
  assert.doesNotMatch(source, /bottom: 0/);
  assert.match(source, /absolute inset-x-0 flex flex-col/);
  assert.match(source, /data-virtual-message-id/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /MESSAGE_VIRTUALIZATION_THRESHOLD/);
  assert.match(source, /const \[virtualWindow, setVirtualWindow\]/);
  assert.doesNotMatch(source, /startTransition\(syncVirtualWindow\)/);
  assert.match(
    source,
    /requestAnimationFrame\(\(\) => \{[\s\S]*syncVirtualWindow\(\)/,
  );
  assert.match(source, /setVirtualBufferReady\(virtualLayoutKey\)/);
  assert.match(source, /MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX/);
  assert.match(source, /commitMeasuredMessageHeights/);
  assert.match(source, /pendingMeasurementAnchorRef/);
  assert.match(source, /viewportOffset/);
  assert.match(source, /reconcileMessageScrollTop/);
  assert.match(source, /programmaticScrollRef/);
  assert.match(source, /nearBottomRef\.current = distanceFromBottom <= 4/);
  assert.match(source, /pinBottom:[\s\S]*followBottomRef\.current/);
  assert.match(source, /USER_SCROLL_IDLE_MS/);
  assert.match(source, /userScrollIntentRef\.current/);
  assert.match(source, /shouldFollowBottom/);
  assert.match(source, /previous\.sending !== sending/);
  assert.match(source, /previous\.generationKey !== generationKey/);
  assert.match(source, /keepVirtualTailMounted/);
  assert.match(source, /virtualWindow\.layoutKey === virtualLayoutKey/);
  assert.match(source, /lockScrollerToBottomDuringLayout/);
  assert.match(source, /Coalesce post-layout bottom corrections/);
  assert.doesNotMatch(source, /CHAT_LAYOUT_BOTTOM_LOCK_MS/);
  assert.doesNotMatch(source, /bottomLockUntilRef/);
  assert.match(source, /messageCanvasRef/);
  assert.match(source, /const virtualCaches = \[/);
  assert.match(
    source,
    /virtualMessageRefCallbacksRef\.current\.delete\(messageId\)/,
  );
  assert.match(source, /current\.start === next\.start/);
  assert.match(source, /current\.end === next\.end/);
  assert.doesNotMatch(source, /messageOffsets\[absoluteIndex\]/);
  assert.doesNotMatch(source, /setVirtualViewport/);
  assert.doesNotMatch(source, /chat-message-virtual-spacer/);
  assert.doesNotMatch(source, /loadEarlierMessages/);
  assert.match(source, /aria-busy=\{sending\}/);
  assert.match(source, /sending \? 'pointer-events-none select-none' : ''/);
  assert.match(source, /isLastVisualMessage \? 'pb-0'/);
});

test('opening a chat resets stale gestures and pins measured geometry', async () => {
  const source = await readFile(messageListPath, 'utf8');
  const activationEffect = source.match(
    /const shouldResetPosition =[\s\S]*?updateScrollToBottomVisibility\(\);\s*\}\);\s*return \(\) => window\.cancelAnimationFrame\(frame\);/,
  );
  assert.ok(activationEffect, 'chat activation reset block not found');

  // A stale gesture flag from a recent scroll used to veto the open-path
  // bottom pin, so the freshly opened chat sat at a stale offset and jumped.
  assert.match(activationEffect[0], /isUserScrollingRef\.current = false/);
  assert.match(activationEffect[0], /userScrollIntentRef\.current = false/);
  assert.match(
    activationEffect[0],
    /window\.clearTimeout\(userScrollIdleTimerRef\.current\)/,
  );

  // The pin, window sync and visibility update share one pre-paint frame.
  const pinFrame = activationEffect[0].match(
    /const frame = window\.requestAnimationFrame\(\(\) => \{[\s\S]*?pinScrollerToBottom\(\);[\s\S]*?syncVirtualWindow\(\);[\s\S]*?updateScrollToBottomVisibility\(\);/,
  );
  assert.ok(pinFrame);

  // Scroll events produced by geometry clamping after a pin are programmatic
  // for a short window instead of being misread as user gestures.
  assert.match(source, /programmaticScrollUntilRef/);
  assert.match(
    source,
    /programmaticScrollRef\.current \|\|\s*performance\.now\(\) < programmaticScrollUntilRef\.current/,
  );
  assert.match(
    source,
    /beginUserScroll = useCallback\(\(\) => \{[\s\S]*?programmaticScrollUntilRef\.current = 0/,
  );

  // Every bottom-pinning path shares one eligibility predicate.
  assert.match(source, /const isBottomFollowEligible = useCallback/);
  assert.match(source, /isBottomFollowEligible\(\)/);

  // Real message heights resolve through the shared pure helper.
  assert.match(source, /resolveMessageMeasurement\(/);
});

test('composer growth preserves its own scroll without competing bottom pinners', async () => {
  const [composer, chatsScreen, messageList] = await Promise.all([
    readFile(composerPath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);

  assert.match(composer, /const CHAT_COMPOSER_MAX_HEIGHT = 192/);
  assert.match(composer, /const previousScrollTop = textArea\.scrollTop/);
  assert.match(
    composer,
    /textArea\.scrollTop = Math\.min\(previousScrollTop, maxScrollTop\)/,
  );
  const resizeEffect = composer.match(
    /useLayoutEffect\(\(\) => \{[\s\S]*?\n  }, \[draft\]\);/,
  );
  assert.ok(resizeEffect);
  assert.match(resizeEffect[0], /textArea\.style\.height = 'auto'/);
  assert.doesNotMatch(resizeEffect[0], /requestAnimationFrame/);
  assert.doesNotMatch(composer, /new ResizeObserver/);
  assert.doesNotMatch(chatsScreen, /keepBottomPinnedAfterComposerResize/);
  assert.doesNotMatch(chatsScreen, /onHeightChange=/);
  assert.match(messageList, /new ResizeObserver/);
  assert.match(messageList, /!userScrollIntentRef\.current/);
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
