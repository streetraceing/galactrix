import { Button } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type { Chat, Provider } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActions } from './ChatActions';
import { ProviderSelect } from './ProviderSelect';

export function ConversationHeader({
  chat,
  providers,
  onBack,
  onSetProvider,
  onAction,
}: {
  chat: Chat;
  providers: Provider[];
  onBack: () => void;
  onSetProvider: (providerId?: string) => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-separator bg-background/95 px-3 py-3 backdrop-blur sm:px-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2 lg:w-64">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="md:hidden"
          aria-label="К списку чатов"
          onPress={onBack}
        >
          <Icon name="back" className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{chat.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {chat.messageCount} сообщений
          </p>
        </div>
        <div className="lg:hidden">
          <ChatActions chat={chat} onAction={onAction} />
        </div>
      </div>
      <div className="w-full lg:w-72">
        <ProviderSelect
          providers={providers}
          value={chat.providerId}
          onChange={onSetProvider}
        />
      </div>
    </header>
  );
}
