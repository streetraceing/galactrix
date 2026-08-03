import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);
const conversationHeaderPath = new URL(
  '../../src/features/chats/components/ConversationHeader.tsx',
  import.meta.url,
);
const historyModalPath = new URL(
  '../../src/features/chats/components/MessageHistoryModal.tsx',
  import.meta.url,
);
const uiModalPath = new URL(
  '../../src/components/ui/UiModal.tsx',
  import.meta.url,
);
const mobileBackPath = new URL(
  '../../src/hooks/useMobileBackEntry.ts',
  import.meta.url,
);
const chatDialogsPath = new URL(
  '../../src/features/chats/components/ChatDialogs.tsx',
  import.meta.url,
);
const chatSetupPath = new URL(
  '../../src/features/chats/components/ChatSetupModal.tsx',
  import.meta.url,
);
const galaxyEditorPath = new URL(
  '../../src/features/galaxies/components/GalaxyEditorModal.tsx',
  import.meta.url,
);

test('mobile continuation is available only from the context menu', async () => {
  const source = await readFile(messageListPath, 'utf8');
  const compactNavigator = source.match(
    /if \(compact\) \{[\s\S]*?\r?\n  \}\r?\n\r?\n  return \(/,
  )?.[0];

  assert.ok(compactNavigator, 'compact mobile navigator must exist');
  assert.doesNotMatch(compactNavigator, /continueResponseShort|onContinue/);
  assert.match(
    source,
    /ContextMenuItem onClick=\{\(\) => run\(\(\) => onContinue\(message\.id\)\)\}/,
  );
});

test('mobile swipe is easy to acquire and uses one bounded release transition', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /startedAt: performance\.now\(\)/);
  assert.match(
    source,
    /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/,
  );
  assert.match(source, /shouldCommitMobileSwipe\(dx, dy, elapsedMs\)/);
  assert.match(source, /mobileSwipeDragOffset\(dx, hasTarget\)/);
  assert.match(source, /setOffset\(direction \* 104\)/);
  assert.match(source, /setOffset\(-direction \* 52\)/);
  assert.match(source, /duration: 180/);
  assert.doesNotMatch(source, /motion\.animate\(/);
  assert.match(
    source,
    /className="relative -mx-4 px-4 touch-pan-y overflow-x-clip"/,
  );
});

test('mobile message actions open dialogs directly from menu item clicks', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.doesNotMatch(source, /deferOverlayAction/);
  assert.match(source, /ContextMenuItem onClick=\{onEditRequest\}/);
  assert.match(source, /ContextMenuItem onClick=\{onHistoryRequest\}/);
  assert.match(source, /isMobile \? \([\s\S]*?responseHistory/);
});

test('mobile message menus cannot select text and close with the chat canvas', async () => {
  const [messageSource, cssSource] = await Promise.all([
    readFile(messageListPath, 'utf8'),
    readFile(new URL('../../src/App.css', import.meta.url), 'utf8'),
  ]);

  assert.match(
    messageSource,
    /open=\{isMobile \? open && viewActive : undefined\}/,
  );
  assert.match(
    messageSource,
    /if \(isMobile && !viewActive\) setOpen\(false\)/,
  );
  assert.match(
    messageSource,
    /if \(isMobile && !viewActive\) \{[\s\S]*?return <div className="block min-w-0">\{children\}<\/div>/,
  );
  assert.match(
    messageSource,
    /if \(isTouch && selectedMessageIds\.size === 0\) return/,
  );
  assert.match(messageSource, /mobile-message-context-target/);
  assert.match(cssSource, /\.mobile-message-context-target \*/);
  assert.match(cssSource, /-webkit-touch-callout: none !important/);
});

test('input autofocus remains a desktop-only behavior', async () => {
  const sources = await Promise.all(
    [chatDialogsPath, chatSetupPath, galaxyEditorPath].map((path) =>
      readFile(path, 'utf8'),
    ),
  );

  for (const source of sources) {
    assert.match(source, /const autoFocus = !isMobilePlatform\(\)/);
    assert.match(source, /autoFocus=\{autoFocus\}/);
  }
});

test('mobile variant history is viewport bounded and does not use a side submenu', async () => {
  const [messageSource, modalSource] = await Promise.all([
    readFile(messageListPath, 'utf8'),
    readFile(historyModalPath, 'utf8'),
  ]);

  assert.match(messageSource, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(modalSource, /max-h-\[min\(28dvh,12rem\)\]/);
  assert.match(modalSource, /bodyClassName="max-h-full"/);
});

test('chat title uses a full mobile modal and keeps desktop popover', async () => {
  const source = await readFile(conversationHeaderPath, 'utf8');

  assert.match(source, /const isMobile = isMobilePlatform\(\)/);
  assert.match(source, /isMobile \? \([\s\S]*setOverviewOpen\(true\)/);
  assert.match(source, /<UiModal[\s\S]*title=\{chat\.title\}/);
  assert.match(source, /<Popover isOpen=\{overviewOpen\}/);
});

test('mobile modal transitions reuse the pending history entry', async () => {
  const source = await readFile(mobileBackPath, 'utf8');

  assert.match(source, /pendingHistoryBack/);
  assert.match(source, /window\.history\.replaceState/);
  assert.match(source, /scheduleHistoryEntryRemoval/);
  assert.match(source, /window\.setTimeout\([\s\S]*window\.history\.back\(\)/);
});

test('mobile modal keeps its layout viewport while the keyboard changes the visual viewport', async () => {
  const source = await readFile(uiModalPath, 'utf8');

  assert.match(source, /const layoutViewport = \(\) => \(\{/);
  assert.match(source, /setMobileLayoutViewport\(layoutViewport\(\)\)/);
  assert.match(
    source,
    /h-\(--ui-modal-layout-height\)!|!h-\[var\(--ui-modal-layout-height\)\]/,
  );
  assert.match(source, /minWidth: mobileLayoutViewport\.width/);
  assert.match(source, /maxHeight: mobileLayoutViewport\.height/);
  assert.match(source, /'--ui-modal-layout-height'/);
  assert.match(
    source,
    /window\.addEventListener\('orientationchange', updateForOrientation\)/,
  );
  assert.doesNotMatch(source, /window\.visualViewport/);
  assert.doesNotMatch(source, /window\.addEventListener\('resize'/);
});
