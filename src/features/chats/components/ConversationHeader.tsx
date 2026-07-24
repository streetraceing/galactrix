import { Button, Chip } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type { Chat, GalaxyItem, Provider } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActions } from './ChatActions';
import { ProviderSelect } from './ProviderSelect';

export function ConversationHeader({
  chat,
  providers,
  galaxyItems,
  onBack,
  onSetProvider,
  onAction,
}: {
  chat: Chat;
  providers: Provider[];
  galaxyItems: GalaxyItem[];
  onBack: () => void;
  onSetProvider: (providerId?: string) => void;
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

  return (
    <header className="shrink-0 border-b border-separator bg-background/95 px-3 py-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="shrink-0 md:hidden"
            aria-label="К списку чатов"
            onPress={onBack}
          >
            <Icon name="back" className="size-5" />
          </Button>

          <ChatActions chat={chat} onAction={onAction}>
            <div className="min-w-0 cursor-context-menu rounded-xl px-1 py-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold">
                  {chat.title}
                </h2>
                {contextNames.length > 0 ? (
                  <Chip size="sm" variant="soft">
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
        </div>

        <div className="w-full sm:ml-auto sm:max-w-72">
          <ProviderSelect
            providers={providers}
            value={chat.providerId}
            onChange={onSetProvider}
          />
        </div>
      </div>
    </header>
  );
}
