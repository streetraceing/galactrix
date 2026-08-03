import { Button, Popover, Tooltip } from '@heroui/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/Icon';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import type { Chat } from '../../../types';
import type { ChatAction } from '../types';
import { useTranslation } from 'react-i18next';

export function ChatActions({
  chat,
  children,
  onAction,
}: {
  chat: Chat;
  children: ReactNode;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const { t } = useTranslation('chats');
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block min-w-0">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="max-w-fit">
        <ContextMenuLabel>{chat.title}</ContextMenuLabel>
        <ContextMenuItem onClick={() => onAction('configure', chat)}>
          <Icon name="settings" className="size-4 text-accent" />
          {t('chatActions.configureContext')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('duplicate', chat)}>
          <Icon name="copy" className="size-4" />
          {t('chatActions.copyWithoutMessages')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onAction('duplicate-with-messages', chat)}
        >
          <Icon name="branch" className="size-4" />
          {t('chatActions.copyWithMessages')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('rename', chat)}>
          <Icon name="edit" className="size-4" />
          {t('chatActions.rename')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('pin', chat)}>
          <Icon name="pin" className="size-4" />
          {chat.pinned ? t('chatActions.unpin') : t('chatActions.pin')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-warning data-highlighted:bg-warning/10 data-highlighted:text-warning"
          onClick={() => onAction('clear', chat)}
        >
          <Icon name="clear" className="size-4" />
          {t('chatActions.clearHistory')}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => onAction('delete', chat)}
        >
          <Icon name="trash" className="size-4" />
          {t('chatActions.deleteChat')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function ChatActionsButton({
  chat,
  onAction,
  canUseResponseActions,
  responseActionsBusy,
  onRegenerateLast,
  onContinueLast,
}: {
  chat: Chat;
  onAction: (action: ChatAction, chat: Chat) => void;
  canUseResponseActions: boolean;
  responseActionsBusy: boolean;
  onRegenerateLast: () => void;
  onContinueLast: () => void;
}) {
  const { t } = useTranslation('chats');
  const [open, setOpen] = useState(false);
  const run = (action: ChatAction) => {
    setOpen(false);
    onAction(action, chat);
  };
  const runResponseAction = (action: () => void) => {
    setOpen(false);
    action();
  };
  const responseActionDisabled = !canUseResponseActions || responseActionsBusy;

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Tooltip delay={450} closeDelay={75} isDisabled={open}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="shrink-0"
          aria-label={t('chatActions.chatActions')}
        >
          <Icon name="more" className="size-5" />
        </Button>
        <Tooltip.Content>{t('chatActions.chatActions')}</Tooltip.Content>
      </Tooltip>
      <Popover.Content placement="bottom end" className="w-fit">
        <Popover.Dialog className="p-1">
          <Popover.Heading className="truncate px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted">
            {chat.title}
          </Popover.Heading>
          <div className="grid gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              isDisabled={responseActionDisabled}
              onPress={() => runResponseAction(onRegenerateLast)}
            >
              <Icon name="regenerate" className="size-4 text-accent" />
              {t('messageList.regenerate')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              isDisabled={responseActionDisabled}
              onPress={() => runResponseAction(onContinueLast)}
            >
              <Icon name="sparkles" className="size-4 text-accent" />
              {t('messageList.continueResponse')}
            </Button>
            <div className="my-1 h-px bg-separator" />
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('duplicate')}
            >
              <Icon name="copy" className="size-4" />
              {t('chatActions.copyWithoutMessages')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('duplicate-with-messages')}
            >
              <Icon name="branch" className="size-4" />
              {t('chatActions.copyWithMessages')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('rename')}
            >
              <Icon name="edit" className="size-4" />
              {t('chatActions.rename')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('pin')}
            >
              <Icon name="pin" className="size-4" />
              {chat.pinned ? t('chatActions.unpin') : t('chatActions.pin')}
            </Button>
            <div className="my-1 h-px bg-separator" />
            <Button
              size="sm"
              variant="ghost"
              className="justify-start text-warning"
              onPress={() => run('clear')}
            >
              <Icon name="clear" className="size-4" />
              {t('chatActions.clearHistory')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start text-danger"
              onPress={() => run('delete')}
            >
              <Icon name="trash" className="size-4" />
              {t('chatActions.deleteChat')}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
