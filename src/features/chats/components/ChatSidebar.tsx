import { Button, Chip, SearchField, Tooltip } from '@heroui/react';
import { memo, useDeferredValue, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { ChatListItem } from './ChatListItem';
import { useTranslation } from 'react-i18next';

function ChatSidebarComponent({
  chats,
  galaxyItems,
  activeChatId,
  width,
  isVisibleMobile,
  isSinglePane,
  onSelect,
  onNewChat,
  onAction,
}: {
  chats: Chat[];
  galaxyItems: GalaxyItem[];
  activeChatId: string;
  width: number;
  isVisibleMobile: boolean;
  isSinglePane: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const { t } = useTranslation('chats');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const filteredChats = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return chats;
    return chats.filter((chat) =>
      `${chat.title} ${chat.preview}`.toLowerCase().includes(normalized),
    );
  }, [chats, deferredQuery]);

  return (
    <aside
      className={`${isSinglePane ? (isVisibleMobile ? 'mobile-screen-enter flex w-full' : 'hidden') : 'flex w-[min(var(--chat-sidebar-width),36vw)] min-[1300px]:w-(--chat-sidebar-width)'} h-full shrink-0 flex-col border-separator bg-background border-r`}
      style={{ '--chat-sidebar-width': `${width}px` } as CSSProperties}
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {t('chatSidebar.chats')}
            </h1>
            {filteredChats.length > 0 ? (
              <Chip size="sm" variant="secondary" className="bg-transparent">
                {filteredChats.length}
              </Chip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {t('chatSidebar.conversationHistory')}
          </p>
        </div>
        <Tooltip delay={450} closeDelay={75}>
          <Button
            isIconOnly
            size="lg"
            variant="primary"
            aria-label={t('chatSetupModal.newChat')}
            onPress={onNewChat}
          >
            <Icon name="plus" className="size-5" />
          </Button>
          <Tooltip.Content>{t('chatSetupModal.newChat')}</Tooltip.Content>
        </Tooltip>
      </header>

      <div className="px-3 pb-3">
        <SearchField
          fullWidth
          variant="secondary"
          value={query}
          onChange={setQuery}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              autoComplete="off"
              placeholder={t('chatSidebar.searchChats')}
              aria-label={t('chatSidebar.searchChats')}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !filteredChats[0]) return;
                event.preventDefault();
                onSelect(filteredChats[0].id);
              }}
            />
            <SearchField.ClearButton
              aria-label={t('chatSidebar.clearSearch')}
            />
          </SearchField.Group>
        </SearchField>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            galaxyItems={galaxyItems}
            isActive={chat.id === activeChatId}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
        {filteredChats.length === 0 ? (
          <div className="grid flex-1 place-items-center px-4 text-center">
            <div>
              <p className="text-sm font-medium">
                {t('chatSidebar.noChatsFound')}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t('chatSidebar.changeTheQueryOrCreateANewChat')}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export const ChatSidebar = memo(ChatSidebarComponent);
