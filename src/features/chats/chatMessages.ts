import type { Chat, Message } from '../../types';

export function activeChatById(chats: Chat[], activeChatId: string) {
  if (!activeChatId) return undefined;
  return chats.find((chat) => chat.id === activeChatId);
}

export function messagesForChat(messages: Message[], chatId: string) {
  if (!chatId) return [];
  return messages.filter((message) => message.chatId === chatId);
}

export function groupMessagesByChat(messages: Message[]) {
  const grouped = new Map<string, Message[]>();
  for (const message of messages) {
    const chatMessages = grouped.get(message.chatId);
    if (chatMessages) chatMessages.push(message);
    else grouped.set(message.chatId, [message]);
  }
  return grouped;
}
