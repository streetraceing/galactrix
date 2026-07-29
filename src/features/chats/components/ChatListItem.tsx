import { Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { galaxyItemAvatar } from '../../../lib/avatar';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { markdownToPreview } from '../utils';
import { ChatActions } from './ChatActions';

export function ChatListItem({
  chat,
  galaxyItems,
  isActive,
  onSelect,
  onAction,
}: {
  chat: Chat;
  galaxyItems: GalaxyItem[];
  isActive: boolean;
  onSelect: (id: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const character = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === chat.characterId,
  );

  return (
    <ChatActions chat={chat} onAction={onAction}>
      <Surface
        variant={isActive ? 'default' : 'transparent'}
        className={`group relative min-w-0 overflow-hidden rounded-xl border transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full ${
          isActive
            ? 'md:border-separator md:before:bg-accent bg-transparent md:bg-surface'
            : 'border-transparent before:bg-transparent hover:bg-surface'
        }`}
      >
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          onClick={() => onSelect(chat.id)}
        >
          <AppAvatar
            src={galaxyItemAvatar(character)}
            name={character?.name ?? chat.title}
            className="size-10"
            square
          />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <strong className="min-w-0 flex-1 truncate text-sm font-semibold flex items-center gap-2">
                {chat.title}
                <span className="block truncate text-[0.7rem] text-muted">
                  {character?.name ?? 'Персонаж не выбран'}
                </span>
              </strong>
              {chat.pinned ? (
                <Chip size="sm" variant="soft" className="bg-transparent">
                  <Icon name="pin" className="size-3" />
                </Chip>
              ) : null}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted">
              <span className="min-w-0 flex-1 truncate">
                {markdownToPreview(chat.preview) || 'Сообщений пока нет'}
              </span>
              <span className="shrink-0">{chat.updatedAt}</span>
            </span>
          </span>
        </button>
      </Surface>
    </ChatActions>
  );
}
