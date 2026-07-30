import type { Chat, Message } from '../../types';

export function activeChatById(chats: Chat[], activeChatId: string) {
  if (!activeChatId) return undefined;
  return chats.find((chat) => chat.id === activeChatId);
}

export function messagesForChat(messages: Message[], chatId: string) {
  if (!chatId) return [];
  return messages.filter((message) => message.chatId === chatId);
}
