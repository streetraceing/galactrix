import type { Chat, GalaxyItem, Provider } from '../../types';

export const RECENT_COLLECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type ChatCollectionKind =
  'all' | 'unread' | 'recent' | 'generating' | 'tag' | 'character' | 'provider';

export type ChatCollection = {
  id: string;
  kind: ChatCollectionKind;
  /** Tag value, character id or provider id for the keyed kinds. */
  key?: string;
  count: number;
};

export function isChatUnread(chat: Chat): boolean {
  return chat.messageCount > 0 && chat.updatedAt > chat.lastReadAt;
}

function isRecentlyActive(chat: Chat, nowMs: number): boolean {
  return nowMs - chat.updatedAt * 1_000 <= RECENT_COLLECTION_WINDOW_MS;
}

export function chatsInCollection(
  chats: Chat[],
  collectionId: string,
  generatingChatIds: ReadonlySet<string> = new Set(),
  nowMs: number = Date.now(),
): Chat[] {
  if (collectionId === 'all') return chats;
  if (collectionId === 'unread') return chats.filter(isChatUnread);
  if (collectionId === 'recent') {
    return chats.filter((chat) => isRecentlyActive(chat, nowMs));
  }
  if (collectionId === 'generating') {
    return chats.filter((chat) => generatingChatIds.has(chat.id));
  }
  const [kind, ...rest] = collectionId.split(':');
  const key = rest.join(':');
  if (kind === 'tag') return chats.filter((chat) => chat.tags.includes(key));
  if (kind === 'character') {
    return chats.filter((chat) => chat.characterId === key);
  }
  if (kind === 'provider') {
    return chats.filter((chat) => chat.providerId === key);
  }
  return chats;
}

export function listChatCollections({
  chats,
  characters = [],
  providers = [],
  generatingChatIds = new Set<string>(),
  nowMs = Date.now(),
}: {
  chats: Chat[];
  characters?: Pick<GalaxyItem, 'id' | 'name'>[];
  providers?: Pick<Provider, 'id' | 'name'>[];
  generatingChatIds?: ReadonlySet<string>;
  nowMs?: number;
}): ChatCollection[] {
  const collections: ChatCollection[] = [
    {
      id: 'all',
      kind: 'all',
      count: chats.length,
    },
    {
      id: 'unread',
      kind: 'unread',
      count: chats.filter(isChatUnread).length,
    },
    {
      id: 'recent',
      kind: 'recent',
      count: chats.filter((chat) => isRecentlyActive(chat, nowMs)).length,
    },
  ];
  if (generatingChatIds.size > 0) {
    collections.push({
      id: 'generating',
      kind: 'generating',
      count: generatingChatIds.size,
    });
  }

  const tagCounts = new Map<string, number>();
  for (const chat of chats) {
    for (const tag of chat.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  for (const [tag, count] of [...tagCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    collections.push({ id: `tag:${tag}`, kind: 'tag', key: tag, count });
  }

  for (const character of characters) {
    const count = chats.filter(
      (chat) => chat.characterId === character.id,
    ).length;
    if (count > 0) {
      collections.push({
        id: `character:${character.id}`,
        kind: 'character',
        key: character.id,
        count,
      });
    }
  }

  for (const provider of providers) {
    const count = chats.filter(
      (chat) => chat.providerId === provider.id,
    ).length;
    if (count > 0) {
      collections.push({
        id: `provider:${provider.id}`,
        kind: 'provider',
        key: provider.id,
        count,
      });
    }
  }

  return collections;
}
