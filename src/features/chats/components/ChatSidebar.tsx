import { Button, Chip, Input } from '@heroui/react';
import type { CSSProperties, ChangeEvent } from 'react';
import { Icon } from '../../../components/Icon';
import type { Chat } from '../../../types';
import type { ChatAction } from '../types';
import { ChatListItem } from './ChatListItem';

export function ChatSidebar({
  chats,
  activeChatId,
  query,
  width,
  isVisibleMobile,
  onQueryChange,
  onSelect,
  onNewChat,
  onAction,
}: {
  chats: Chat[];
  activeChatId: string;
  query: string;
  width: number;
  isVisibleMobile: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <aside
      className={`${isVisibleMobile ? 'flex' : 'hidden'} h-full w-full shrink-0 flex-col border-r border-separator bg-background md:flex md:w-(--chat-sidebar-width)`}
      style={{ '--chat-sidebar-width': `${width}px` } as CSSProperties}
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Чаты</h1>
            {chats.length > 0 ? (
              <Chip size="sm" variant="secondary">
                {chats.length}
              </Chip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">История разговоров</p>
        </div>
        <Button
          isIconOnly
          size="lg"
          variant="primary"
          aria-label="Новый чат"
          onPress={onNewChat}
        >
          <Icon name="plus" className="size-5" />
        </Button>
      </header>

      <div className="px-3 pb-3">
        <Input
          fullWidth
          variant="secondary"
          value={query}
          placeholder="Поиск по чатам"
          aria-label="Поиск по чатам"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onQueryChange(event.target.value)
          }
        />
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
        {chats.length === 0 ? (
          <div className="grid flex-1 place-items-center px-4 text-center">
            <div>
              <p className="text-sm font-medium">Чаты не найдены</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Измените запрос или создайте новый чат.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
