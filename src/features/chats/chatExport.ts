import type { Chat, Message } from '../../types';
import { formatMessageTime } from './messageTime';

export type ChatExportFormat = 'markdown' | 'json';

export type ChatExportRoleLabels = {
  user: string;
  assistant: string;
  system: string;
  exportedFrom: string;
};

export function chatExportFilename(
  chat: Chat,
  format: ChatExportFormat,
  now: Date = new Date(),
): string {
  const slug =
    chat.title
      .trim()
      .toLocaleLowerCase('ru-RU')
      .replace(/[^a-zа-яё0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'chat';
  const date = now.toISOString().slice(0, 10);
  return `galactrix-chat-${slug}-${date}.${
    format === 'markdown' ? 'md' : 'json'
  }`;
}

function orderedMessages(messages: Message[]): Message[] {
  return [...messages].sort((left, right) => left.createdAt - right.createdAt);
}

function roleLabel(role: string, labels: ChatExportRoleLabels): string {
  if (role === 'user') return labels.user;
  if (role === 'assistant') return labels.assistant;
  return labels.system;
}

/// Human-readable conversation transcript; content only, no metadata.
export function buildChatMarkdown(
  chat: Chat,
  messages: Message[],
  labels: ChatExportRoleLabels,
  now: Date = new Date(),
): string {
  const ordered = orderedMessages(messages);
  const lines: string[] = [
    `# ${chat.title}`,
    '',
    `_${labels.exportedFrom} ${now.toLocaleString()} · ${ordered.length}_`,
  ];
  for (const message of ordered) {
    lines.push(
      '',
      '---',
      '',
      `**${roleLabel(message.role, labels)}** · ${formatMessageTime(
        message.createdAt,
        'en',
      )}`,
      '',
      message.content.trim(),
    );
  }
  return `${lines.join('\n')}\n`;
}

/// Full-fidelity snapshot: chat metadata plus every message with its variant
/// history, ratings, notes and generation reports.
export function buildChatJson(
  chat: Chat,
  messages: Message[],
  now: Date = new Date(),
): Record<string, unknown> {
  const ordered = orderedMessages(messages);
  return {
    format: 'galactrix-chat',
    version: 1,
    exportedAt: now.toISOString(),
    chat: {
      id: chat.id,
      title: chat.title,
      tags: chat.tags,
      pinned: chat.pinned,
      archived: chat.archived,
      personaId: chat.personaId,
      characterId: chat.characterId,
      universeId: chat.universeId,
      providerId: chat.providerId,
      worldbookIds: chat.worldbookIds,
    },
    messages: ordered.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      edited: Boolean(message.edited),
      remembered: Boolean(message.remembered),
      variants: message.variants.map((variant) => ({
        index: variant.index,
        content: variant.content,
        createdAt: variant.createdAt,
        edited: Boolean(variant.edited),
        rating: variant.rating ?? null,
        note: variant.note ?? null,
        report: variant.report ?? null,
      })),
    })),
  };
}
