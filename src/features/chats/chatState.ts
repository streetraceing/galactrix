import type { AppSnapshot, Message } from '../../types';

export function sortChats(chats: AppSnapshot['chats']) {
  return [...chats].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      right.updatedAt - left.updatedAt,
  );
}

function sameMessageVariants(
  left: Message['variants'],
  right: Message['variants'],
) {
  if (left.length !== right.length) return false;
  return left.every((variant, index) => {
    const candidate = right[index];
    return (
      candidate != null &&
      variant.id === candidate.id &&
      variant.index === candidate.index &&
      variant.content === candidate.content &&
      variant.createdAt === candidate.createdAt &&
      Boolean(variant.edited) === Boolean(candidate.edited)
    );
  });
}

export function reconcileChatMessages(
  currentMessages: Message[],
  chatId: string,
  incomingMessages: Message[],
) {
  const currentById = new Map(
    currentMessages
      .filter((message) => message.chatId === chatId)
      .map((message) => [message.id, message] as const),
  );
  const reconciled = incomingMessages.map((message) => {
    const current = currentById.get(message.id);
    if (!current) return message;

    const unchanged =
      current.role === message.role &&
      current.content === message.content &&
      current.updatedAt === message.updatedAt &&
      Boolean(current.edited) === Boolean(message.edited) &&
      current.remembered === message.remembered &&
      current.activeVariantIndex === message.activeVariantIndex &&
      sameMessageVariants(current.variants, message.variants);
    if (unchanged) return current;

    return {
      ...message,
      // Optimistic messages use the same ids as the database rows. Keeping the
      // displayed timestamp prevents the message header from jumping at commit.
      createdAt: current.pending ? current.createdAt : message.createdAt,
      pending: undefined,
    };
  });

  return [
    ...currentMessages.filter((message) => message.chatId !== chatId),
    ...reconciled,
  ];
}

export function findMessageChatId(messages: Message[], messageId: string) {
  return messages.find((message) => message.id === messageId)?.chatId;
}

export function selectMessageVariantInSnapshot(
  snapshot: AppSnapshot,
  messageId: string,
  variantIndex: number,
  updatedAt: number,
) {
  const message = snapshot.messages.find((item) => item.id === messageId);
  const selected = message?.variants.find(
    (variant) => variant.index === variantIndex,
  );
  if (!message || !selected) return snapshot;

  let latestMessageId = '';
  for (let index = snapshot.messages.length - 1; index >= 0; index -= 1) {
    const candidate = snapshot.messages[index];
    if (candidate?.chatId === message.chatId) {
      latestMessageId = candidate.id;
      break;
    }
  }

  return {
    ...snapshot,
    messages: snapshot.messages.map((item) =>
      item.id === messageId
        ? {
            ...item,
            content: selected.content,
            updatedAt,
            edited: Boolean(selected.edited),
            activeVariantIndex: selected.index,
          }
        : item,
    ),
    chats:
      latestMessageId === messageId
        ? snapshot.chats.map((chat) =>
            chat.id === message.chatId
              ? { ...chat, preview: selected.content }
              : chat,
          )
        : snapshot.chats,
  };
}
