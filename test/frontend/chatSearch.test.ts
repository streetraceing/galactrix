import assert from 'node:assert/strict';
import test from 'node:test';
import { searchChats } from '../../src/features/chats/chatSearch.ts';
import {
  formatMessageDate,
  messageDateKey,
} from '../../src/features/chats/messageTime.ts';
import { defaultPromptConfig } from '../../src/features/chats/promptConfig.ts';
import type { Chat, Message } from '../../src/types.ts';

function chat(id: string, title: string, updatedAt = 0): Chat {
  return {
    id,
    title,
    preview: '',
    updatedAt,
    messageCount: 0,
    pinned: false,
    archived: false,
    autoTitle: true,
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
    generationSettings: {},
  };
}

function message(chatId: string, content: string, createdAt = 0): Message {
  return {
    id: `${chatId}-${createdAt}`,
    chatId,
    role: 'assistant',
    content,
    createdAt,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
  };
}

test('chat search ranks titles and finds normalized message text', () => {
  const chats = [chat('messages', 'Диалог', 2), chat('title', 'Ёжик', 1)];
  const messages = [
    message('messages', 'Сегодня обсудим ежей и их привычки', 10),
  ];

  const titleResults = searchChats(chats, messages, 'ежик');
  assert.equal(titleResults[0]?.chat.id, 'title');

  const messageResults = searchChats(chats, messages, 'привычки');
  assert.equal(messageResults[0]?.chat.id, 'messages');
  assert.match(messageResults[0]?.matchPreview ?? '', /привычки/);
});

test('message dates form stable local day groups and localized labels', () => {
  const morning = new Date(2026, 7, 21, 9, 30).getTime() / 1_000;
  const evening = new Date(2026, 7, 21, 21, 30).getTime() / 1_000;
  const nextDay = new Date(2026, 7, 22, 9, 30).getTime() / 1_000;

  assert.equal(messageDateKey(morning), messageDateKey(evening));
  assert.notEqual(messageDateKey(morning), messageDateKey(nextDay));
  assert.match(formatMessageDate(morning, 'ru'), /2026/);
  assert.match(formatMessageDate(morning, 'en'), /2026/);
});
