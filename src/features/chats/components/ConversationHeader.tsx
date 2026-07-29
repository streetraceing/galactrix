import { Button, Chip } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { galaxyItemAvatar } from '../../../lib/avatar';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActions } from './ChatActions';

export function ConversationHeader({
  chat,
  galaxyItems,
  showBack,
  onBack,
  onAction,
}: {
  chat: Chat;
  galaxyItems: GalaxyItem[];
  showBack: boolean;
  onBack: () => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const contextNames = [
    galaxyItems.find((item) => item.id === chat.personaId)?.name,
    galaxyItems.find((item) => item.id === chat.characterId)?.name,
    galaxyItems.find((item) => item.id === chat.universeId)?.name,
    ...chat.worldbookIds
      .map((id) => galaxyItems.find((item) => item.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  ].filter((name): name is string => Boolean(name));
  const character = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === chat.characterId,
  );

  return (
    <header className="shrink-0 border-b border-separator bg-background/95 px-3 py-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {showBack ? (
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="shrink-0"
            aria-label="К списку чатов"
            onPress={onBack}
          >
            <Icon name="back" className="size-5" />
          </Button>
        ) : null}

        <AppAvatar
          src={galaxyItemAvatar(character)}
          name={character?.name ?? chat.title}
          className="size-9"
          square
        />

        <ChatActions chat={chat} onAction={onAction}>
          <div className="min-w-0 flex-1 cursor-context-menu rounded-xl py-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold">{chat.title}</h2>
              {contextNames.length > 0 ? (
                <Chip size="sm" variant="soft" className="bg-transparent">
                  {contextNames.length}
                </Chip>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {contextNames.length > 0
                ? contextNames.join(' · ')
                : `${chat.messageCount} сообщений · контекст не выбран`}
            </p>
          </div>
        </ChatActions>

        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="ml-auto shrink-0"
          aria-label="Настройки чата"
          onPress={() => onAction('configure', chat)}
        >
          <Icon name="more" className="size-5" />
        </Button>
      </div>
    </header>
  );
}
