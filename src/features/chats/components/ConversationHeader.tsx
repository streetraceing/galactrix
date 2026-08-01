import { Button, Chip, Popover } from '@heroui/react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import { UiModal } from '../../../components/ui/UiModal';
import { useRelativeTime } from '../../../i18n/useRelativeTime';
import { galaxyItemAvatar } from '../../../lib/avatar';
import { isMobilePlatform } from '../../../lib/platform';
import type { Chat, GalaxyItem, Provider } from '../../../types';
import type { ChatAction } from '../types';
import { ChatActionsButton } from './ChatActions';

function ContextItem({
  icon,
  label,
  value,
  emptyLabel,
}: {
  icon: IconName;
  label: string;
  value?: string;
  emptyLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-default/55 p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-muted">
        <Icon name={icon} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-medium tracking-wide text-foreground">
          {label}
        </span>
        <strong
          className={`mt-0.5 block truncate text-sm font-medium ${
            value ? 'text-foreground' : 'text-muted'
          }`}
        >
          {value || emptyLabel}
        </strong>
      </span>
    </div>
  );
}

function ConversationOverview({
  chat,
  provider,
  persona,
  character,
  universe,
  worldbooks,
  relativeUpdatedAt,
  showIdentityHeader,
  onConfigure,
}: {
  chat: Chat;
  provider?: Provider;
  persona?: GalaxyItem;
  character?: GalaxyItem;
  universe?: GalaxyItem;
  worldbooks: GalaxyItem[];
  relativeUpdatedAt: string;
  showIdentityHeader: boolean;
  onConfigure: () => void;
}) {
  const { t } = useTranslation('chats');

  return (
    <div className="min-w-0 overflow-hidden">
      {showIdentityHeader ? (
        <div className="relative overflow-hidden border-b border-separator p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative flex min-w-0 items-center gap-3">
            <AppAvatar
              src={galaxyItemAvatar(character)}
              name={character?.name ?? chat.title}
              className="size-12 shrink-0"
              square
            />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-base">{chat.title}</strong>
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <Chip size="sm" variant="soft">
                  <Icon name="chats" className="size-3" />
                  {t('count.message', { count: chat.messageCount })}
                </Chip>
                {chat.pinned ? (
                  <Chip size="sm" variant="soft">
                    <Icon name="pin" className="size-3" />
                    {t('conversationHeader.pinned')}
                  </Chip>
                ) : null}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5">
          <Chip size="sm" variant="soft">
            <Icon name="chats" className="size-3" />
            {t('count.message', { count: chat.messageCount })}
          </Chip>
          {chat.pinned ? (
            <Chip size="sm" variant="soft">
              <Icon name="pin" className="size-3" />
              {t('conversationHeader.pinned')}
            </Chip>
          ) : null}
        </div>
      )}

      <div
        className={`grid grid-cols-2 gap-2 ${
          showIdentityHeader ? 'border-b border-separator p-3' : 'mb-4'
        }`}
      >
        <div className="min-w-0 rounded-xl bg-default/55 p-3">
          <span className="flex items-center gap-1.5 text-[0.68rem] font-medium tracking-wide text-foreground">
            <Icon name="telescope" className="size-3.5" />
            {t('conversationHeader.connection')}
          </span>
          <strong className="mt-1.5 block truncate text-sm">
            {provider?.name || t('conversationHeader.noProviderSelected')}
          </strong>
          {provider?.model ? (
            <span className="mt-0.5 block truncate text-xs text-muted">
              {provider.model}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 rounded-xl bg-default/55 p-3">
          <span className="flex items-center gap-1.5 text-[0.68rem] font-medium tracking-wide text-foreground">
            <Icon name="history" className="size-3.5" />
            {t('conversationHeader.lastActivity')}
          </span>
          <strong className="mt-1.5 block truncate text-sm">
            {relativeUpdatedAt}
          </strong>
        </div>
      </div>

      <div className={showIdentityHeader ? 'space-y-4 p-4' : 'space-y-4'}>
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-foreground">
            {t('conversationHeader.latestMessage')}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted">
            {chat.preview ||
              t('conversationHeader.thereAreNoMessagesInThisChatYet')}
          </p>
        </section>

        <section>
          <h3 className="text-xs font-semibold tracking-wide text-foreground">
            {t('chatContextPicker.roleplayContext')}
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <ContextItem
              icon="user"
              label={t('chatContextPicker.userPersona')}
              value={persona?.name}
              emptyLabel={t('conversationHeader.notSelected')}
            />
            <ContextItem
              icon="profile"
              label={t('chatContextPicker.assistantCharacter')}
              value={character?.name}
              emptyLabel={t('conversationHeader.notSelected')}
            />
            <ContextItem
              icon="planet"
              label={t('chatContextPicker.universe')}
              value={universe?.name}
              emptyLabel={t('conversationHeader.notSelected')}
            />
            <ContextItem
              icon="book"
              label={t('chatContextPicker.worldbooks')}
              value={worldbooks.map((item) => item.name).join(', ')}
              emptyLabel={t('conversationHeader.notSelected')}
            />
          </div>
        </section>

        <Button fullWidth size="sm" variant="secondary" onPress={onConfigure}>
          <Icon name="settings" className="size-4" />
          {t('conversationHeader.openChatSettings')}
        </Button>
      </div>
    </div>
  );
}

function ConversationHeaderComponent({
  chat,
  provider,
  galaxyItems,
  showBack,
  maximized,
  onBack,
  onToggleMaximized,
  onAction,
}: {
  chat: Chat;
  provider?: Provider;
  galaxyItems: GalaxyItem[];
  showBack: boolean;
  maximized: boolean;
  onBack: () => void;
  onToggleMaximized: () => void;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const relativeUpdatedAt = useRelativeTime(chat.updatedAt);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const persona = galaxyItems.find(
    (item) => item.kind === 'persona' && item.id === chat.personaId,
  );
  const character = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === chat.characterId,
  );
  const universe = galaxyItems.find(
    (item) => item.kind === 'universe' && item.id === chat.universeId,
  );
  const worldbooks = chat.worldbookIds
    .map((id) => galaxyItems.find((item) => item.id === id))
    .filter((item): item is GalaxyItem => Boolean(item));
  const contextNames = [
    persona?.name,
    character?.name,
    universe?.name,
    ...worldbooks.map((item) => item.name),
  ].filter((name): name is string => Boolean(name));
  const contextSummary =
    contextNames.length > 0
      ? contextNames.join(' · ')
      : t('conversationHeader.noContextSummary', {
          value1: t('count.message', { count: chat.messageCount }),
        });
  const configure = () => {
    setOverviewOpen(false);
    onAction('configure', chat);
  };
  const titleSummary = (
    <div className="min-w-0 py-0.5">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-base font-semibold">{chat.title}</h2>
        {contextNames.length > 0 ? (
          <Chip size="sm" variant="soft" className="bg-transparent">
            {contextNames.length}
          </Chip>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">{contextSummary}</p>
    </div>
  );

  return (
    <>
      <header className="shrink-0 border-b border-separator bg-background px-3 py-3 sm:px-4">
        <div
          className={`mx-auto flex min-w-0 items-center gap-2 ${
            maximized ? 'max-w-5xl' : 'max-w-none'
          }`}
        >
          {showBack ? (
            <TooltipIconButton
              label={t('conversationHeader.backToChats')}
              size="sm"
              variant="ghost"
              className="shrink-0"
              onPress={onBack}
            >
              <Icon name="back" className="size-5" />
            </TooltipIconButton>
          ) : null}

          <AppAvatar
            src={galaxyItemAvatar(character)}
            name={character?.name ?? chat.title}
            className="size-9"
            square
          />

          {isMobile ? (
            <button
              type="button"
              className="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => setOverviewOpen(true)}
            >
              {titleSummary}
            </button>
          ) : (
            <Popover isOpen={overviewOpen} onOpenChange={setOverviewOpen}>
              <Popover.Trigger className="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-focus">
                {titleSummary}
              </Popover.Trigger>
              <Popover.Content
                placement="bottom start"
                offset={10}
                className="w-[min(calc(100vw-1rem),28rem)] max-w-none overflow-hidden p-0"
              >
                <Popover.Arrow />
                <Popover.Dialog className="scrollbar-thin max-h-[min(80dvh,42rem)] overflow-y-auto p-0">
                  <Popover.Heading className="sr-only">
                    {chat.title}
                  </Popover.Heading>
                  <ConversationOverview
                    chat={chat}
                    provider={provider}
                    persona={persona}
                    character={character}
                    universe={universe}
                    worldbooks={worldbooks}
                    relativeUpdatedAt={relativeUpdatedAt}
                    showIdentityHeader
                    onConfigure={configure}
                  />
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          )}

          <TooltipIconButton
            label={t('chatSetupModal.chatSettings')}
            size="sm"
            variant="ghost"
            className="ml-auto shrink-0"
            onPress={() => onAction('configure', chat)}
          >
            <Icon name="settings" className="size-5" />
          </TooltipIconButton>
          {!isMobile ? (
            <TooltipIconButton
              label={
                maximized
                  ? t('conversationHeader.restoreChatLayout')
                  : t('conversationHeader.maximizeChat')
              }
              size="sm"
              variant={maximized ? 'secondary' : 'ghost'}
              className="shrink-0"
              aria-pressed={maximized}
              onPress={onToggleMaximized}
            >
              <Icon
                name={maximized ? 'screen-normal' : 'screen-full'}
                className="size-5"
              />
            </TooltipIconButton>
          ) : null}
          <ChatActionsButton chat={chat} onAction={onAction} />
        </div>
      </header>

      {isMobile ? (
        <UiModal
          isOpen={overviewOpen}
          onOpenChange={setOverviewOpen}
          title={chat.title}
          description={contextSummary}
          size="full"
        >
          <ConversationOverview
            chat={chat}
            provider={provider}
            persona={persona}
            character={character}
            universe={universe}
            worldbooks={worldbooks}
            relativeUpdatedAt={relativeUpdatedAt}
            showIdentityHeader={false}
            onConfigure={configure}
          />
        </UiModal>
      ) : null}
    </>
  );
}

export const ConversationHeader = memo(ConversationHeaderComponent);
