import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);
const chatsScreenPath = new URL(
  '../../src/features/chats/ChatsScreen.tsx',
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
const contextMenuPath = new URL(
  '../../src/components/ui/context-menu.tsx',
  import.meta.url,
);
const contextSelectionPath = new URL(
  '../../src/hooks/useContextSelection.ts',
  import.meta.url,
);
const appControllerPath = new URL(
  '../../src/app/useAppController.ts',
  import.meta.url,
);

test('mobile continuation is available only from the context menu', async () => {
  const source = await readFile(messageListPath, 'utf8');
  const compactNavigator = source.match(
    /if \(compact\) \{[\s\S]*?\r?\n  \}\r?\n\r?\n  return \(/,
  )?.[0];

  assert.ok(compactNavigator, 'compact mobile navigator must exist');
  assert.doesNotMatch(compactNavigator, /continueResponseShort|onContinue/);
  assert.doesNotMatch(compactNavigator, /messageList\.swipeLeft/);
  assert.match(
    source,
    /ContextMenuItem onClick=\{\(\) => run\(\(\) => onContinue\(message\.id\)\)\}/,
  );
});

test('chat overflow menu routes response actions through the animated message pipeline', async () => {
  const [screenSource, messageSource, headerSource] = await Promise.all([
    readFile(chatsScreenPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
    readFile(conversationHeaderPath, 'utf8'),
  ]);

  assert.match(screenSource, /requestLatestResponseAction\('regenerate'\)/);
  assert.match(screenSource, /requestLatestResponseAction\('continue'\)/);
  assert.match(screenSource, /responseActionRequest=\{responseActionRequest\}/);
  assert.match(messageSource, /responseActionRequest\.action === 'regenerate'/);
  assert.match(messageSource, /runMessageGeneration/);
  assert.match(headerSource, /onRegenerateLast=\{onRegenerateLast\}/);
  assert.match(headerSource, /onContinueLast=\{onContinueLast\}/);
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
  assert.match(source, /duration: MOTION_DURATION_MS\.standard/);
  assert.match(source, /easing: MOTION_EASING\.enter/);
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

test('mobile message selection survives scrolling and consumes back before chat navigation', async () => {
  const [messageSource, screenSource] = await Promise.all([
    readFile(messageListPath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
  ]);

  assert.match(
    messageSource,
    /useMobileBackEntry\([\s\S]*?selectedMessageIds\.size > 0,[\s\S]*?clearMessageSelection/,
  );
  assert.match(
    messageSource,
    /useEffect\(\(\) => \{\s*if \(\s*isMobile \|\|[\s\S]*?const onPointerDown/,
  );
  assert.match(
    messageSource,
    /toggleMessageSelection\(current, gesture\.startId\)/,
  );
  assert.match(
    messageSource,
    /selectionActive=\{selectedMessageIds\.size > 0\}/,
  );
  assert.match(screenSource, /if \(messageSelectionActive\)/);
  assert.match(
    screenSource,
    /setClearMessageSelectionRequest\(\(current\) => current \+ 1\)/,
  );
  assert.match(screenSource, /onBack=\{handleConversationBack\}/);
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
  assert.match(modalSource, /max-h-\[min\(50dvh,24rem\)\]/);
  assert.match(modalSource, /bodyClassName="max-h-full"/);
});

test('chat title uses a full mobile modal and keeps desktop popover', async () => {
  const source = await readFile(conversationHeaderPath, 'utf8');

  assert.match(source, /const isMobile = isMobilePlatform\(\)/);
  assert.match(source, /isMobile \? \([\s\S]*setOverviewOpen\(true\)/);
  assert.match(source, /<UiModal[\s\S]*title=\{chat\.title\}/);
  assert.match(source, /<Popover isOpen=\{overviewOpen\}/);
});

test('mobile modal transitions skip retired nested history entries', async () => {
  const source = await readFile(mobileBackPath, 'utf8');

  assert.match(source, /const activeEntries = new Map<string, \(\) => void>/);
  assert.match(source, /const retiredEntries = new Set<string>/);
  assert.match(source, /removeRetiredEntryIfNeeded/);
  assert.match(source, /scheduleHistoryEntryRemoval/);
  assert.match(source, /window\.setTimeout\([\s\S]*window\.history\.back\(\)/);
});

test('mobile back stays inside the app for stale sessions, menus, selections, and archive', async () => {
  const [back, menu, selection, controller, screen] = await Promise.all([
    readFile(mobileBackPath, 'utf8'),
    readFile(contextMenuPath, 'utf8'),
    readFile(contextSelectionPath, 'utf8'),
    readFile(appControllerPath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
  ]);

  assert.match(back, /historySessionId/);
  assert.match(back, /resetStaleHistoryEntry\(\)/);
  assert.match(menu, /useMobileBackEntry\(isMobilePlatform\(\) && open/);
  assert.match(menu, /actionsRef\.current\?\.close\(\)/);
  assert.match(selection, /useMobileBackEntry\(selectedIds\.size > 0, clear\)/);
  assert.match(controller, /if \(tab === 'chats'\) \{/);
  assert.match(controller, /setChatListRequest\(\(current\) => current \+ 1\)/);
  assert.match(screen, /isMobile && !isChatOpen && archiveMode/);
  assert.match(screen, /changeArchiveMode\(false\)/);
});

test('chat tail follows generation, variants, and keyboard without duplicating regeneration', async () => {
  const [messageSource, controllerSource, screenSource] = await Promise.all([
    readFile(messageListPath, 'utf8'),
    readFile(appControllerPath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
  ]);

  assert.match(controllerSource, /setActiveMessageGeneration/);
  assert.match(messageSource, /effectiveMessageGeneration/);
  assert.match(messageSource, /activeMessageGeneration\?\.chatId === chatId/);
  assert.match(
    messageSource,
    /const chatChanged = previous\.chatId !== chatId/,
  );
  assert.doesNotMatch(
    messageSource,
    /const chatChanged = previous\.chatId !== chatId \|\| !previous\.active/,
  );
  assert.match(messageSource, /tailLayoutKey/);
  assert.match(messageSource, /followBottomRef/);
  assert.match(messageSource, /viewportHeight/);
  assert.match(messageSource, /syncVirtualWindow\(\)/);
  assert.match(screenSource, /viewportHeight=\{keyboardViewportHeight\}/);
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
