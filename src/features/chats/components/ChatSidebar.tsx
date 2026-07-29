import { Button, Chip, SearchField } from '@heroui/react';
import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { ChatListItem } from './ChatListItem';

export function ChatSidebar({
  chats,
  galaxyItems,
  activeChatId,
  query,
  width,
  isVisibleMobile,
  isSinglePane,
  onQueryChange,
  onSelect,
  onNewChat,
  onAction,
}: {
  chats: Chat[];
  galaxyItems: GalaxyItem[];
  activeChatId: string;
  query: string;
  width: number;
  isVisibleMobile: boolean;
  isSinglePane: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <aside
      className={`${isSinglePane ? (isVisibleMobile ? 'mobile-screen-enter flex w-full' : 'hidden') : 'flex w-[min(var(--chat-sidebar-width),36vw)] min-[1300px]:w-(--chat-sidebar-width)'} h-full shrink-0 flex-col border-separator bg-background`}
      style={{ '--chat-sidebar-width': `${width}px` } as CSSProperties}
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Чаты</h1>
            {chats.length > 0 ? (
              <Chip size="sm" variant="secondary" className="bg-transparent">
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
        <SearchField
          fullWidth
          variant="secondary"
          value={query}
          onChange={onQueryChange}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Поиск по чатам"
              aria-label="Поиск по чатам"
            />
            <SearchField.ClearButton aria-label="Очистить поиск" />
          </SearchField.Group>
        </SearchField>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            galaxyItems={galaxyItems}
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
