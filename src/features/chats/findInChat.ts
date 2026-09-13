import type { Message } from '../../types';

export type ChatFindMatch = {
  messageId: string;
  count: number;
};

/// Finds messages whose content contains the query (case-insensitive),
/// in conversation order, with per-message occurrence counts.
export function findMessageMatches(
  messages: Message[],
  query: string,
): ChatFindMatch[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];

  const matches: ChatFindMatch[] = [];
  for (const message of messages) {
    const haystack = message.content.toLocaleLowerCase();
    if (!haystack.includes(needle)) continue;
    let count = 0;
    let position = haystack.indexOf(needle);
    while (position !== -1) {
      count += 1;
      position = haystack.indexOf(needle, position + needle.length);
    }
    matches.push({ messageId: message.id, count });
  }
  return matches;
}
