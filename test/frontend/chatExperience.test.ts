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

test('chat switching keeps one full-width canvas without a temporary skeleton', async () => {
  const [screen, list] = await Promise.all([
    readFile(chatsScreenPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);

  assert.match(screen, /const canvasChat = activeChat/);
  assert.match(screen, /const canvasMessages = activeChat/);
  assert.doesNotMatch(screen, /canvasChatId/);
  assert.doesNotMatch(screen, /isCanvasSwitching/);
  assert.doesNotMatch(screen, /animate-pulse/);
  assert.doesNotMatch(screen, /aria-busy/);
  assert.match(list, /MESSAGE_VIRTUALIZATION_THRESHOLD/);
  assert.doesNotMatch(list, /richContentChatId/);
  assert.doesNotMatch(list, /setRichContentChatId/);
});

test('chat navigation survives restart while every opened chat resets to bottom', async () => {
  const [controller, list, screen] = await Promise.all([
    readFile(controllerPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
    readFile(chatsScreenPath, 'utf8'),
  ]);
  const navigate = controller.match(
    /const navigate = useCallback\([\s\S]*?\n  \);/,
  )?.[0];

  assert.ok(navigate);
  assert.doesNotMatch(navigate, /closeChat\(/);
  assert.match(controller, /readChatNavigationState\(\)/);
  assert.match(
    controller,
    /startTransition\(\(\) => \{[\s\S]*setActiveChatId\(chatId\)/,
  );
  assert.match(
    controller,
    /saveChatNavigationState\(activeChatId, isChatOpen\)/,
  );
  assert.match(screen, /viewActive=\{!isSinglePane \|\| isChatOpen\}/);
  assert.match(list, /shouldReset[\s\S]*previous\.chatId !== chatId/);
  assert.match(list, /scroller\.scrollTop = scroller\.scrollHeight/);
  assert.match(list, /Number\.POSITIVE_INFINITY/);
  assert.doesNotMatch(list, /saveChatScrollPosition/);
  assert.doesNotMatch(list, /readChatScrollPosition/);
  assert.doesNotMatch(list, /visibilitychange/);
  assert.doesNotMatch(list, /pagehide/);
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

test('full prompt preview includes the current conversation history', async () => {
  const [types, previewBuilder, modal, screen, backend] = await Promise.all([
    readFile(new URL('../../src/types.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../../src/features/chats/promptPreview.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL(
        '../../src/features/chats/components/ChatSetupModal.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(chatsScreenPath, 'utf8'),
    readFile(new URL('../../src-tauri/src/lib.rs', import.meta.url), 'utf8'),
  ]);

  assert.match(types, /conversationMessages: Message\[\]/);
  assert.match(previewBuilder, /conversationMessages/);
  assert.match(previewBuilder, /message\.remembered/);
  assert.match(modal, /messages\s*=\s*\[\]/);
  assert.match(screen, /messages=\{configMessages\}/);
  assert.match(backend, /input\.conversation_messages/);
  assert.match(backend, /prompt\.push_str\("\[SYSTEM\]\\n"\)/);
  assert.match(backend, /"assistant" => "ASSISTANT"/);
});

test('optimistic messages keep stable ids through the backend commit', async () => {
  const [controller, frontendBackend, rustBackend, list] = await Promise.all([
    readFile(controllerPath, 'utf8'),
    readFile(new URL('../../src/lib/backend.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src-tauri/src/lib.rs', import.meta.url), 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);

  assert.match(controller, /const userMessageId = createGenerationId\(\)/);
  assert.match(controller, /const assistantMessageId = createGenerationId\(\)/);
  assert.match(controller, /reconcileChatMessages\(/);
  assert.match(frontendBackend, /userMessageId/);
  assert.match(frontendBackend, /assistantMessageId/);
  assert.match(rustBackend, /user_message_id: Option<String>/);
  assert.match(rustBackend, /assistant_message_id: Option<String>/);
  assert.match(list, /keepVirtualTailMounted/);
});
