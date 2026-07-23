import { Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type { Chat } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActions } from './ChatActions';

export function ChatListItem({
  chat,
  isActive,
  onSelect,
  onAction,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: (id: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <Surface
      variant={isActive ? 'default' : 'transparent'}
      className={`group relative flex min-w-0 items-center overflow-hidden rounded-xl border transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:transition-colors hover:bg-surface ${
        isActive
          ? 'border-separator before:bg-accent'
          : 'border-transparent before:bg-transparent'
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => onSelect(chat.id)}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name="chats" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <strong className="min-w-0 flex-1 truncate text-sm font-semibold">
              {chat.title}
            </strong>
            {chat.pinned ? (
              <Chip size="sm" variant="soft">
                <Icon name="pin" className="size-3" />
              </Chip>
            ) : null}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="min-w-0 flex-1 truncate">
              {chat.preview || 'Сообщений пока нет'}
            </span>
            <span className="shrink-0">{chat.updatedAt}</span>
          </span>
        </span>
      </button>
      <div className="pr-2">
        <ChatActions chat={chat} onAction={onAction} />
      </div>
    </Surface>
  );
}
