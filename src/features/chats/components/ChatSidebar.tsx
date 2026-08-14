import { Button, Chip, Dropdown, Label, SearchField } from '@heroui/react';
import { memo, useDeferredValue, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { ContextSelectionToolbar } from '../../../components/ui/ContextSelectionToolbar';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { ChatListItem } from './ChatListItem';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/cn';

function ChatSidebarComponent({
  chats,
  galaxyItems,
  activeChatId,
  width,
  isVisibleMobile,
  isSinglePane,
  archiveMode,
  archivedCount,
  selectedIds,
  selectionActive,
  onSelect,
  onNewChat,
  onAction,
  onToggleSelection,
  onStartSelection,
  onClearSelection,
  onSelectAll,
  onArchiveSelected,
  onDeleteSelected,
  onArchiveModeChange,
}: {
  chats: Chat[];
  galaxyItems: GalaxyItem[];
  activeChatId: string;
  width: number;
  isVisibleMobile: boolean;
  isSinglePane: boolean;
  archiveMode: boolean;
  archivedCount: number;
  selectedIds: Set<string>;
  selectionActive: boolean;
  onSelect: (id: string) => void;
  onNewChat: (characterId?: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
  onToggleSelection: (id: string) => void;
  onStartSelection: (id: string) => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  onArchiveModeChange: (archived: boolean) => void;
}) {
  const { t } = useTranslation('chats');
  const [query, setQuery] = useState('');
  const characters = useMemo(
    () => galaxyItems.filter((item) => item.kind === 'character'),
    [galaxyItems],
  );
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );
  const scopedChats = useMemo(
    () => chats.filter((chat) => Boolean(chat.archived) === archiveMode),
    [archiveMode, chats],
  );
  const deferredQuery = useDeferredValue(query);
  const filteredChats = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return scopedChats;
    return scopedChats.filter((chat) =>
      `${chat.title} ${chat.preview}`.toLowerCase().includes(normalized),
    );
  }, [deferredQuery, scopedChats]);

  return (
    <aside
      className={cn(
        'chat-sidebar h-full shrink-0 flex-col',
        isSinglePane
          ? isVisibleMobile
            ? 'app-screen-enter flex w-full'
            : 'hidden'
          : 'flex w-[min(var(--chat-sidebar-width),36vw)] min-[1300px]:w-(--chat-sidebar-width)',
      )}
      style={{ '--chat-sidebar-width': `${width}px` } as CSSProperties}
    >
      <header className="chat-sidebar__header">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {archiveMode ? t('chatSidebar.archive') : t('chatSidebar.chats')}
            </h1>
            {scopedChats.length > 0 ? (
              <Chip size="sm" variant="secondary" className="bg-transparent">
                {scopedChats.length}
              </Chip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {archiveMode
              ? t('chatSidebar.archiveDescription')
              : t('chatSidebar.conversationHistory')}
          </p>
        </div>

        <TooltipIconButton
          label={
            archiveMode
              ? t('chatSidebar.backToActiveChats')
              : t('chatSidebar.openArchive', { count: archivedCount })
          }
          size="lg"
          variant="tertiary"
          className={`shrink-0 ${archiveMode ? 'text-accent' : ''}`}
          tooltipPlacement="bottom"
          onPress={() => onArchiveModeChange(!archiveMode)}
        >
          <Icon
            name={archiveMode ? 'unarchive' : 'archive'}
            className="size-5"
          />
        </TooltipIconButton>

        {!archiveMode ? (
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
                <Dropdown.Item
                  id="blank"
                  textValue={t('chatSetupModal.newChat')}
                >
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
        ) : null}
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
              placeholder={
                archiveMode
                  ? t('chatSidebar.searchArchive')
                  : t('chatSidebar.searchChats')
              }
              aria-label={
                archiveMode
                  ? t('chatSidebar.searchArchive')
                  : t('chatSidebar.searchChats')
              }
              onKeyDown={(event) => {
                if (
                  event.key !== 'Enter' ||
                  !filteredChats[0] ||
                  selectionActive
                )
                  return;
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

      <ContextSelectionToolbar
        count={selectedIds.size}
        total={scopedChats.length}
        selectedLabel={t('selection.selectedCount', {
          count: selectedIds.size,
        })}
        clearLabel={t('selection.clear')}
        selectAllLabel={t('selection.selectAll')}
        onClear={onClearSelection}
        onSelectAll={onSelectAll}
        className="shrink-0 px-2 pb-2"
        actions={[
          {
            key: archiveMode ? 'unarchive' : 'archive',
            label: archiveMode
              ? t('selection.unarchiveChats')
              : t('selection.archiveChats'),
            icon: archiveMode ? 'unarchive' : 'archive',
            onPress: onArchiveSelected,
          },
          {
            key: 'delete',
            label: t('selection.deleteChats'),
            icon: 'trash',
            danger: true,
            onPress: onDeleteSelected,
          },
        ]}
      />

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            character={
              chat.characterId ? characterById.get(chat.characterId) : undefined
            }
            isActive={chat.id === activeChatId}
            selectionActive={selectionActive}
            selected={selectedIds.has(chat.id)}
            onSelect={onSelect}
            onAction={onAction}
            onToggleSelection={onToggleSelection}
            onStartSelection={onStartSelection}
          />
        ))}
        {filteredChats.length === 0 ? (
          <div className="grid flex-1 place-items-center px-4 text-center">
            <div>
              <p className="text-sm font-medium">
                {archiveMode
                  ? t('chatSidebar.archiveEmpty')
                  : t('chatSidebar.noChatsFound')}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {archiveMode
                  ? t('chatSidebar.archiveEmptyDescription')
                  : t('chatSidebar.changeTheQueryOrCreateANewChat')}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export const ChatSidebar = memo(ChatSidebarComponent);
