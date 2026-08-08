import { Button, Chip, Dropdown, Label, SearchField } from '@heroui/react';
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
  onNewChat: (characterId?: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const { t } = useTranslation('chats');
  const [query, setQuery] = useState('');
  const characters = useMemo(
    () => galaxyItems.filter((item) => item.kind === 'character'),
    [galaxyItems],
  );
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
        <Dropdown>
          <Button
            size="lg"
            variant="primary"
            className="shrink-0 px-3"
            aria-label={t('chatSidebar.quickCreate')}
          >
            <Icon name="plus" className="size-5" />
            <span className="hidden text-sm min-[390px]:inline">
              {t('chatSidebar.create')}
            </span>
            <Icon name="chevron" className="size-3.5 rotate-90" />
          </Button>
          <Dropdown.Popover
            placement="bottom end"
            className="min-w-64 max-w-[min(22rem,calc(100vw-2rem))]"
          >
            <Dropdown.Menu
              aria-label={t('chatSidebar.quickCreateDescription')}
              onAction={(key) =>
                onNewChat(String(key) === 'blank' ? undefined : String(key))
              }
            >
              <Dropdown.Item id="blank" textValue={t('chatSetupModal.newChat')}>
                <Icon name="chats" className="size-4" />
                <Label>{t('chatSidebar.blankChat')}</Label>
              </Dropdown.Item>
              {characters.map((character) => (
                <Dropdown.Item
                  key={character.id}
                  id={character.id}
                  textValue={t('chatSidebar.chatWithCharacter', {
                    name: character.name,
                  })}
                >
                  <Icon name="brain" className="size-4" />
                  <span className="min-w-0">
                    <Label>{character.name}</Label>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {t('chatSidebar.chatWithCharacterHint')}
                    </span>
                  </span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
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
