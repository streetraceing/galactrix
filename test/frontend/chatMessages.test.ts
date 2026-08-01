import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeChatById,
  groupMessagesByChat,
  messagesForChat,
} from '../../src/features/chats/chatMessages.ts';
import type { Chat, Message } from '../../src/types.ts';

function chat(id: string): Chat {
  return {
    id,
    title: id,
    preview: '',
    updatedAt: 0,
    messageCount: 0,
    pinned: false,
    promptConfig: {
      recentMessageLimit: 0,
      setIds: [],
      presetIds: [],
      contextPriorities: {
        persona: 'normal',
        character: 'normal',
        universe: 'normal',
        worldbooks: 'normal',
        remembered: 'normal',
        presets: 'normal',
      },
      customBlocks: [],
    },
    worldbookIds: [],
  };
}

function message(id: string, chatId: string): Message {
  return {
    id,
    chatId,
    role: 'user',
    content: id,
    createdAt: 43_200,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
  };
}

test('an unresolved active chat never falls back to another chat', () => {
  const chats = [chat('chat-a'), chat('chat-b')];

  assert.equal(activeChatById(chats, 'chat-b')?.id, 'chat-b');
  assert.equal(activeChatById(chats, 'missing-chat'), undefined);
  assert.equal(activeChatById(chats, ''), undefined);
});

test('chat message selection never includes messages from another chat', () => {
  const messages = [message('a-1', 'chat-a'), message('b-1', 'chat-b')];

  assert.deepEqual(
    messagesForChat(messages, 'chat-b').map((item) => item.id),
    ['b-1'],
  );
  assert.deepEqual(messagesForChat(messages, 'missing-chat'), []);
  assert.deepEqual(messagesForChat(messages, ''), []);
});

test('messages are grouped once and looked up without rescanning all chats', () => {
  const grouped = groupMessagesByChat([
    message('a-1', 'chat-a'),
    message('b-1', 'chat-b'),
    message('a-2', 'chat-a'),
  ]);

  assert.deepEqual(
    grouped.get('chat-a')?.map((item) => item.id),
    ['a-1', 'a-2'],
  );
  assert.deepEqual(
    grouped.get('chat-b')?.map((item) => item.id),
    ['b-1'],
  );
});
