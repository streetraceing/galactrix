import { Chip, Surface } from '@heroui/react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { SelectionIndicator } from '../../../components/ui/SelectionIndicator';
import { useRelativeTime } from '../../../i18n/useRelativeTime';
import { galaxyItemAvatar } from '../../../lib/avatar';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { markdownToPreview } from '../utils';
import { ChatActions } from './ChatActions';

function ChatListItemComponent({
  chat,
  matchPreview,
  character,
  isActive,
  onSelect,
  onAction,
  selectionActive,
  selected,
  onToggleSelection,
  onStartSelection,
}: {
  chat: Chat;
  matchPreview?: string;
  character?: GalaxyItem;
  isActive: boolean;
  onSelect: (id: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
  selectionActive: boolean;
  selected: boolean;
  onToggleSelection: (id: string) => void;
  onStartSelection: (id: string) => void;
}) {
  const { t } = useTranslation('chats');
  const relativeUpdatedAt = useRelativeTime(chat.updatedAt);
  const characterName = character?.name.trim();
  const normalizedTitle = chat.title.trim().toLocaleLowerCase();
  const normalizedCharacterName = characterName?.toLocaleLowerCase();
  const showCharacterLabel =
    !characterName ||
    !normalizedCharacterName ||
    !normalizedTitle.includes(normalizedCharacterName);

  return (
    <ChatActions
      chat={chat}
      onAction={onAction}
      selected={selected}
      onStartSelection={() =>
        selected ? onToggleSelection(chat.id) : onStartSelection(chat.id)
      }
    >
      <Surface
        variant={isActive ? 'default' : 'transparent'}
        className={`collection-item-enter group relative min-w-0 overflow-hidden rounded-xl transition-[color,background-color,box-shadow] duration-(--motion-fast) ease-(--motion-ease) before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:transition-colors before:duration-(--motion-fast) ${
          selected
            ? 'bg-accent/10 ring-1 ring-inset ring-accent/45 before:bg-accent'
            : isActive
              ? 'md:before:bg-accent bg-transparent md:bg-surface'
              : 'before:bg-transparent hover:bg-surface'
        }`}
      >
        <button
          type="button"
          className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          aria-pressed={selectionActive ? selected : undefined}
          onClick={() =>
            selectionActive ? onToggleSelection(chat.id) : onSelect(chat.id)
          }
        >
          {selectionActive ? <SelectionIndicator selected={selected} /> : null}
          <AppAvatar
            src={galaxyItemAvatar(character)}
            name={character?.name ?? chat.title}
            className="size-10"
            square
          />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <strong className="min-w-0 truncate text-sm font-semibold">
                  {chat.title}
                </strong>
                {showCharacterLabel ? (
                  <span className="min-w-0 truncate text-[0.7rem] text-muted">
                    {characterName ?? t('chatListItem.noCharacterSelected')}
                  </span>
                ) : null}
              </span>
              {chat.pinned ? (
                <Chip size="sm" variant="soft" className="bg-transparent">
                  <Icon name="pin" className="size-3" />
                </Chip>
              ) : null}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted">
              <span className="min-w-0 flex-1 truncate">
                {markdownToPreview(matchPreview ?? chat.preview) ||
                  t('chatListItem.noMessagesYet')}
              </span>
              <span className="shrink-0">{relativeUpdatedAt}</span>
            </span>
          </span>
        </button>
      </Surface>
    </ChatActions>
  );
}

export const ChatListItem = memo(ChatListItemComponent);
