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
const controllerPath = new URL(
  '../../src/hooks/useAppController.ts',
  import.meta.url,
);
const setupModalPath = new URL(
  '../../src/features/chats/components/ChatSetupModal.tsx',
  import.meta.url,
);
const databasePath = new URL('../../src-tauri/src/db.rs', import.meta.url);

test('large chat switching yields before mounting the next rich message canvas', async () => {
  const [screen, list] = await Promise.all([
    readFile(chatsScreenPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);

  assert.match(
    screen,
    /requestAnimationFrame\(\(\) => \{[\s\S]*startTransition/,
  );
  assert.match(screen, /canvasChatId/);
  assert.match(screen, /aria-busy=\{isCanvasSwitching\}/);
  assert.doesNotMatch(
    screen,
    /activeMessages\.length[\s\S]*scrollTop = scroller\.scrollHeight/,
  );
  assert.match(list, /setTimeout\(\(\) => \{[\s\S]*setRichContentChatId/);
  assert.match(list, /rich=\{richContentChatId === chatId\}/);
  assert.match(list, /whitespace-pre-wrap break-words/);
});

test('open chat and per-chat scroll positions survive navigation and restart', async () => {
  const [controller, list] = await Promise.all([
    readFile(controllerPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);
  const navigate = controller.match(
    /const navigate = useCallback\([\s\S]*?\n  \);/,
  )?.[0];

  assert.ok(navigate);
  assert.doesNotMatch(navigate, /closeChat\(/);
  assert.match(controller, /readChatNavigationState\(\)/);
  assert.match(
    controller,
    /saveChatNavigationState\(activeChatId, isChatOpen\)/,
  );
  assert.match(list, /readChatScrollPosition\(chatId\)/);
  assert.match(list, /saveChatScrollPosition\(chatId/);
  assert.match(list, /anchorMessageId/);
  assert.match(list, /visibilitychange/);
  assert.match(list, /pagehide/);
});

test('new chats can start with an assistant greeting', async () => {
  const [modal, database] = await Promise.all([
    readFile(setupModalPath, 'utf8'),
    readFile(databasePath, 'utf8'),
  ]);

  assert.match(modal, /greetingMessage: ''/);
  assert.match(modal, /<TextArea[\s\S]*chat-greeting/);
  assert.match(modal, /chat \? undefined : greetingMessage \|\| undefined/);
  assert.match(database, /input[\s\S]*greeting_message/);
  assert.match(database, /'assistant'/);
  assert.match(database, /message_variants/);
});
