import { Button, Dropdown } from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../components/Icon';
import type { Chat } from '../../../types';
import type { ChatAction } from '../types';

export function ChatActions({
  chat,
  onAction,
}: {
  chat: Chat;
  onAction: (action: ChatAction, chat: Chat) => void;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="shrink-0 data-[pressed=true]:scale-100"
          aria-label={`Действия с чатом «${chat.title}»`}
        >
          <Icon name="more" className="size-4" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key: Key) => onAction(String(key) as ChatAction, chat)}
        >
          <Dropdown.Item id="rename" textValue="Переименовать">
            <span className="flex items-center gap-2 text-accent">
              <Icon name="edit" className="size-4" /> Переименовать
            </span>
          </Dropdown.Item>
          <Dropdown.Item
            id="pin"
            textValue={chat.pinned ? 'Открепить' : 'Закрепить'}
          >
            <span className="flex items-center gap-2">
              <Icon name="pin" className="size-4" />
              {chat.pinned ? 'Открепить' : 'Закрепить'}
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="clear" textValue="Очистить историю">
            <span className="flex items-center gap-2 text-warning">
              <Icon name="clear" className="size-4" /> Очистить историю
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue="Удалить" variant="danger">
            <span className="flex items-center gap-2 text-danger">
              <Icon name="trash" className="size-4" /> Удалить
            </span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
