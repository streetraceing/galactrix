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
      <ContextMenuContent className="w-56 bg-surface-secondary/75 backdrop-blur-md">
        <ContextMenuLabel>{chat.title}</ContextMenuLabel>
        <ContextMenuItem onClick={() => onAction('configure', chat)}>
          <Icon name="settings" className="size-4 text-accent" />
          Настроить контекст
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAction('duplicate', chat)}>
          <Icon name="copy" className="size-4" />
          Создать копию настроек
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
          className="text-warning data-highlighted:text-warning hover:bg-warning-soft! hover:text-warning!"
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
