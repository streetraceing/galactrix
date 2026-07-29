import { Button, Popover } from '@heroui/react';
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

export function ChatActions({
  chat,
  children,
  onAction,
}: {
  chat: Chat;
  children: ReactNode;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block min-w-0">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{chat.title}</ContextMenuLabel>
        <ContextMenuItem onClick={() => onAction('configure', chat)}>
          <Icon name="settings" className="size-4 text-accent" />
          Настроить контекст
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('duplicate', chat)}>
          <Icon name="copy" className="size-4" />
          Копия без сообщений
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onAction('duplicate-with-messages', chat)}
        >
          <Icon name="branch" className="size-4" />
          Копия с сообщениями
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('rename', chat)}>
          <Icon name="edit" className="size-4" />
          Переименовать
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('pin', chat)}>
          <Icon name="pin" className="size-4" />
          {chat.pinned ? 'Открепить' : 'Закрепить'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-warning data-highlighted:bg-warning/10 data-highlighted:text-warning"
          onClick={() => onAction('clear', chat)}
        >
          <Icon name="clear" className="size-4" />
          Очистить историю
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => onAction('delete', chat)}
        >
          <Icon name="trash" className="size-4" />
          Удалить чат
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function ChatActionsButton({
  chat,
  onAction,
}: {
  chat: Chat;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  const [open, setOpen] = useState(false);
  const run = (action: ChatAction) => {
    setOpen(false);
    onAction(action, chat);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="shrink-0"
        aria-label="Действия с чатом"
      >
        <Icon name="more" className="size-5" />
      </Button>
      <Popover.Content placement="bottom end" className="w-60">
        <Popover.Dialog className="p-1">
          <Popover.Heading className="truncate px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted">
            {chat.title}
          </Popover.Heading>
          <div className="grid gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('duplicate')}
            >
              <Icon name="copy" className="size-4" />
              Копия без сообщений
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('duplicate-with-messages')}
            >
              <Icon name="branch" className="size-4" />
              Копия с сообщениями
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('rename')}
            >
              <Icon name="edit" className="size-4" />
              Переименовать
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onPress={() => run('pin')}
            >
              <Icon name="pin" className="size-4" />
              {chat.pinned ? 'Открепить' : 'Закрепить'}
            </Button>
            <div className="my-1 h-px bg-separator" />
            <Button
              size="sm"
              variant="ghost"
              className="justify-start text-warning"
              onPress={() => run('clear')}
            >
              <Icon name="clear" className="size-4" />
              Очистить историю
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start text-danger"
              onPress={() => run('delete')}
            >
              <Icon name="trash" className="size-4" />
              Удалить чат
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
