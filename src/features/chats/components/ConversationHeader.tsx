import { Button, Chip, Popover, Tooltip } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { galaxyItemAvatar } from '../../../lib/avatar';
import { countRu } from '../../../lib/plural';
import type { Chat, GalaxyItem } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActionsButton } from './ChatActions';

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

        <Popover>
          <Popover.Trigger className="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <div className="min-w-0 py-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold">
                  {chat.title}
                </h2>
                {contextNames.length > 0 ? (
                  <Chip size="sm" variant="soft" className="bg-transparent">
                    {contextNames.length}
                  </Chip>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">
                {contextNames.length > 0
                  ? contextNames.join(' · ')
                  : `${countRu(chat.messageCount, ['сообщение', 'сообщения', 'сообщений'])} · контекст не выбран`}
              </p>
            </div>
          </Popover.Trigger>
          <Popover.Content
            placement="bottom start"
            className="max-w-sm md:max-w-md lg:max-w-xl"
          >
            <Popover.Dialog>
              <Popover.Heading className="flex items-center gap-3">
                <AppAvatar
                  src={galaxyItemAvatar(character)}
                  name={character?.name ?? chat.title}
                  className="size-11"
                  square
                />
                <span className="min-w-0">
                  <strong className="block truncate">{chat.title}</strong>
                  <span className="mt-0.5 block text-xs text-muted">
                    {countRu(chat.messageCount, [
                      'сообщение',
                      'сообщения',
                      'сообщений',
                    ])}
                  </span>
                </span>
              </Popover.Heading>
              <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted">
                {chat.preview || 'В этом чате пока нет сообщений.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {contextNames.length > 0 ? (
                  contextNames.map((name) => (
                    <Chip key={name} size="sm" variant="soft">
                      {name}
                    </Chip>
                  ))
                ) : (
                  <Chip size="sm" variant="soft">
                    Контекст не выбран
                  </Chip>
                )}
              </div>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>

        <Tooltip>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="ml-auto shrink-0"
              aria-label="Настроить контекст чата"
              onPress={() => onAction('configure', chat)}
            >
              <Icon name="settings" className="size-5" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Настройки чата</Tooltip.Content>
        </Tooltip>
        <ChatActionsButton chat={chat} onAction={onAction} />
      </div>
    </header>
  );
}
