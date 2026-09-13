import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { findMessageMatches } from '../../src/features/chats/findInChat';
import type { Message } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

function message(overrides: Partial<Message> & { id: string }): Message {
  return {
    chatId: 'chat-1',
    role: 'user',
    content: '',
    createdAt: 0,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
    ...overrides,
  };
}

test('find-in-chat matches in conversation order with per-message counts', () => {
  const messages = [
    message({ id: 'a', content: 'Mars colony reports' }),
    message({ id: 'b', content: 'nothing relevant' }),
    message({ id: 'c', content: 'mars bar with MARS topping' }),
  ];

  assert.deepEqual(findMessageMatches(messages, 'mars'), [
    { messageId: 'a', count: 1 },
    { messageId: 'c', count: 2 },
  ]);
  // Case-insensitive and trimmed; whitespace-only queries match nothing.
  assert.deepEqual(findMessageMatches(messages, 'MARS '), [
    { messageId: 'a', count: 1 },
    { messageId: 'c', count: 2 },
  ]);
  assert.deepEqual(findMessageMatches(messages, '   '), []);
  assert.deepEqual(findMessageMatches(messages, ''), []);
});

test('the find bar lives in MessageList with navigation and flash highlight', async () => {
  const [list, css, findModule] = await Promise.all([
    read('src/features/chats/components/MessageList.tsx'),
    read('src/App.css'),
    read('src/features/chats/findInChat.ts'),
  ]);

  assert.match(list, /findMessageMatches\(messages, findQuery\)/);
  assert.match(list, /goToFindMatch\(/);
  assert.match(list, /data-message-id="\$\{CSS\.escape\(messageId\)\}"/);
  // Navigation flashes the matched bubble via the data-related ring hook.
  assert.match(list, /findFlashActive === message\.id/);
  assert.match(
    css,
    /data-related='true'\] \.message-surface \{\s*@apply ring-2 ring-accent\/70/,
  );
  // The bar is keyboard-first: Enter advances, Shift+Enter goes back, Escape closes.
  assert.match(list, /event\.shiftKey \? findIndex - 1 : findIndex \+ 1/);
  assert.match(list, /role="search"/);
  assert.match(list, /aria-live="polite"/);
  // Pure matcher is a separate module (testable without React).
  assert.match(findModule, /export function findMessageMatches/);
});
