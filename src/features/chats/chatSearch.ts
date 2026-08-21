import type { Chat, Message } from '../../types';

export type ChatSearchResult = {
  chat: Chat;
  matchPreview?: string;
  score: number;
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function matchSnippet(content: string, normalizedQuery: string) {
  const flat = content.replace(/\s+/g, ' ').trim();
  const normalized = normalizeSearchText(flat);
  const position = normalized.indexOf(normalizedQuery);
  if (position < 0 || flat.length <= 140) return flat.slice(0, 140);
  const start = Math.max(0, position - 48);
  const end = Math.min(flat.length, start + 140);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${
    end < flat.length ? '…' : ''
  }`;
}

export function searchChats(
  chats: readonly Chat[],
  messages: readonly Message[],
  query: string,
): ChatSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return chats.map((chat) => ({ chat, score: 0 }));
  }
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const messagesByChat = new Map<string, Message[]>();
  for (const message of messages) {
    const grouped = messagesByChat.get(message.chatId);
    if (grouped) grouped.push(message);
    else messagesByChat.set(message.chatId, [message]);
  }

  return chats
    .map((chat): ChatSearchResult | null => {
      const title = normalizeSearchText(chat.title);
      const preview = normalizeSearchText(chat.preview);
      let score = 0;
      if (title === normalizedQuery) score += 160;
      else if (title.startsWith(normalizedQuery)) score += 120;
      else if (title.includes(normalizedQuery)) score += 90;
      if (tokens.every((token) => title.includes(token))) score += 45;
      if (preview.includes(normalizedQuery)) score += 35;

      let matchedMessage: Message | undefined;
      const chatMessages = messagesByChat.get(chat.id) ?? [];
      for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
        const message = chatMessages[index];
        const normalizedContent = normalizeSearchText(message.content);
        const exactPhrase = normalizedContent.includes(normalizedQuery);
        const allTokens = tokens.every((token) =>
          normalizedContent.includes(token),
        );
        if (!exactPhrase && !allTokens) continue;
        matchedMessage = message;
        score += exactPhrase ? 70 : 42;
        score += Math.max(0, 12 - (chatMessages.length - 1 - index));
        break;
      }

      if (score === 0) return null;
      return {
        chat,
        score,
        matchPreview: matchedMessage
          ? matchSnippet(matchedMessage.content, normalizedQuery)
          : undefined,
      };
    })
    .filter((result): result is ChatSearchResult => result != null)
    .sort(
      (left, right) =>
        right.score - left.score || right.chat.updatedAt - left.chat.updatedAt,
    );
}
