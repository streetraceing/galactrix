import {
  Button,
  Dropdown,
  Input,
  Label,
  ListBox,
  Select,
  Surface,
  TextArea,
} from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Key, KeyboardEvent } from 'react';
import { Icon } from '../components/Icon';
import { ResizeHandle } from '../components/ResizeHandle';
import { UiModal } from '../components/UiModal';
import type { Chat, Message, Provider } from '../types';

function draftKey(chatId: string) {
  return `galactrix:draft:${chatId}`;
}

type ChatAction = 'rename' | 'pin' | 'clear' | 'delete';

function ChatActions({
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
            <span className="flex items-center gap-2">
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
            <span className="flex items-center gap-2">
              <Icon name="clear" className="size-4" /> Очистить историю
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue="Удалить" variant="danger">
            <span className="flex items-center gap-2">
              <Icon name="trash" className="size-4" /> Удалить
            </span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function ChatsScreen({
  chats,
  messages,
  providers,
  activeChatId,
  chatSidebarWidth,
  onChatSidebarWidthPreview,
  onChatSidebarWidthCommit,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onSetPinned,
  onClearChat,
  onSend,
  onSetProvider,
  sendOnEnter,
  saveDrafts,
  sending,
}: {
  chats: Chat[];
  messages: Message[];
  providers: Provider[];
  activeChatId: string;
  chatSidebarWidth: number;
  onChatSidebarWidthPreview: (width: number) => void;
  onChatSidebarWidthCommit: (width: number) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onSetPinned: (chatId: string, pinned: boolean) => Promise<void>;
  onClearChat: (chatId: string) => Promise<void>;
  onSend: (content: string, providerId: string) => Promise<void>;
  onSetProvider: (chatId: string, providerId?: string) => Promise<void>;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  sending: boolean;
}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [showHistoryMobile, setShowHistoryMobile] = useState(true);
  const [sendError, setSendError] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'clear' | 'delete';
    chat: Chat;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const filteredChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return chats;
    return chats.filter((chat) =>
      `${chat.title} ${chat.preview}`.toLowerCase().includes(normalized),
    );
  }, [chats, query]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0];
  const activeMessages = messages.filter(
    (message) => message.chatId === activeChat?.id,
  );
  const activeProvider = providers.find(
    (provider) => provider.id === activeChat?.providerId,
  );

  useEffect(() => {
    if (!activeChat?.id) {
      setDraft('');
      setShowHistoryMobile(true);
      return;
    }
    setDraft(
      saveDrafts ? (localStorage.getItem(draftKey(activeChat.id)) ?? '') : '',
    );
    setSendError('');
  }, [activeChat?.id, saveDrafts]);

  useEffect(() => {
    if (!activeChat?.id) return;
    if (saveDrafts) {
      localStorage.setItem(draftKey(activeChat.id), draft);
    } else {
      localStorage.removeItem(draftKey(activeChat.id));
    }
  }, [activeChat?.id, draft, saveDrafts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [activeMessages.length, activeChat?.id]);

  const selectChat = (id: string) => {
    onSelectChat(id);
    setShowHistoryMobile(false);
  };

  const send = async () => {
    const value = draft.trim();
    if (!value || !activeChat || !activeProvider || sending) return;
    setSendError('');
    try {
      await onSend(value, activeProvider.id);
      setDraft('');
      localStorage.removeItem(draftKey(activeChat.id));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : String(error));
    }
  };

  const openRename = (chat: Chat) => {
    setActionError('');
    setRenameTarget(chat);
    setRenameValue(chat.title);
  };

  const handleAction = (action: ChatAction, chat: Chat) => {
    if (action === 'rename') {
      openRename(chat);
      return;
    }
    if (action === 'pin') {
      setWorking(true);
      setActionError('');
      void onSetPinned(chat.id, !chat.pinned)
        .catch((error) => setActionError(String(error)))
        .finally(() => setWorking(false));
      return;
    }
    setActionError('');
    setConfirmTarget({ type: action, chat });
  };

  const commitRename = async () => {
    const title = renameValue.trim();
    if (!renameTarget || !title || working) return;
    setWorking(true);
    setActionError('');
    try {
      await onRenameChat(renameTarget.id, title);
      setRenameTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
  };

  const commitDestructiveAction = async () => {
    if (!confirmTarget || working) return;
    setWorking(true);
    setActionError('');
    try {
      if (confirmTarget.type === 'delete') {
        localStorage.removeItem(draftKey(confirmTarget.chat.id));
        await onDeleteChat(confirmTarget.chat.id);
      } else {
        await onClearChat(confirmTarget.chat.id);
      }
      setConfirmTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
      <Surface
        variant="secondary"
        className={`${showHistoryMobile ? 'flex' : 'hidden'} h-full min-w-0 flex-1 flex-col rounded-none border-0 md:flex md:flex-none`}
        style={{ width: chatSidebarWidth }}
      >
        <div className="app-divider-bottom flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Чаты</h1>
            <p className="text-xs app-muted">{chats.length} всего</p>
          </div>
          <Button
            isIconOnly
            variant="primary"
            aria-label="Новый чат"
            onPress={onNewChat}
          >
            <Icon name="plus" className="size-5" />
          </Button>
        </div>

        <div className="app-divider-bottom p-3">
          <Input
            fullWidth
            variant="secondary"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)
            }
            placeholder="Поиск по чатам"
            aria-label="Поиск по чатам"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {filteredChats.map((chat) => {
              const selected = chat.id === activeChat?.id;
              return (
                <Surface
                  key={chat.id}
                  variant={selected ? 'tertiary' : 'default'}
                  className="flex items-center gap-1 p-1"
                >
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start px-2 py-2 text-left"
                    onPress={() => selectChat(chat.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {chat.pinned && (
                          <Icon
                            name="pin"
                            className="app-accent size-3.5 shrink-0"
                          />
                        )}
                        <strong className="block min-w-0 truncate text-sm font-medium">
                          {chat.title}
                        </strong>
                      </span>
                      <span className="mt-1 block truncate text-xs app-muted">
                        {chat.preview || 'Сообщений пока нет'}
                      </span>
                    </span>
                    <span className="self-start whitespace-nowrap pt-0.5 text-[0.68rem] app-muted">
                      {chat.updatedAt}
                    </span>
                  </Button>
                  <ChatActions chat={chat} onAction={handleAction} />
                </Surface>
              );
            })}
          </div>

          {filteredChats.length === 0 && (
            <div className="grid min-h-48 place-items-center p-4 text-center">
              <div>
                <p className="text-sm font-medium">
                  {query ? 'Ничего не найдено' : 'Чатов пока нет'}
                </p>
                {!query && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onPress={onNewChat}
                  >
                    Создать чат
                  </Button>
                )}
              </div>
            </div>
          )}
          {actionError && (
            <Surface
              variant="tertiary"
              className="allow-selection mt-2 p-3 text-sm"
            >
              <span className="app-danger">{actionError}</span>
            </Surface>
          )}
        </div>
      </Surface>

      <ResizeHandle
        value={chatSidebarWidth}
        min={248}
        max={560}
        label="Изменить ширину списка чатов"
        onChange={onChatSidebarWidthPreview}
        onCommit={onChatSidebarWidthCommit}
      />

      <section
        className={`${showHistoryMobile ? 'hidden' : 'flex'} h-full min-w-0 flex-1 flex-col md:flex`}
      >
        {activeChat ? (
          <>
            <Surface
              variant="secondary"
              className="flex min-h-16 shrink-0 items-center gap-2 rounded-none px-3 py-2"
            >
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="md:hidden"
                aria-label="Вернуться к списку чатов"
                onPress={() => setShowHistoryMobile(true)}
              >
                <Icon name="back" className="size-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate font-semibold">{activeChat.title}</h2>
                  {activeChat.pinned && (
                    <Icon name="pin" className="app-accent size-3.5 shrink-0" />
                  )}
                </div>
                <Select
                  aria-label="Провайдер чата"
                  value={activeProvider?.id ?? 'none'}
                  onChange={(value: Key | Key[] | null) =>
                    void onSetProvider(
                      activeChat.id,
                      String(value) === 'none' ? undefined : String(value),
                    )
                  }
                  placeholder="Выбрать провайдера"
                  variant="secondary"
                  className="mt-1 max-w-md"
                >
                  <Select.Trigger className="min-h-8 py-1 text-xs">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="none" textValue="Не выбран">
                        <Label>Выбрать провайдера</Label>
                      </ListBox.Item>
                      {providers.map((provider) => (
                        <ListBox.Item
                          id={provider.id}
                          key={provider.id}
                          textValue={`${provider.name} ${provider.model}`}
                        >
                          <Label>
                            {provider.name} · {provider.model}
                          </Label>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <ChatActions chat={activeChat} onAction={handleAction} />
            </Surface>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                {activeMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[92%] sm:max-w-[82%]">
                      <div className="mb-1 flex items-center justify-between gap-4 px-1 text-xs app-muted">
                        <span>
                          {message.role === 'user'
                            ? 'Вы'
                            : message.role === 'assistant'
                              ? (activeProvider?.name ?? 'Ассистент')
                              : 'Система'}
                        </span>
                        <span>{message.createdAt}</span>
                      </div>
                      <Surface
                        variant={
                          message.role === 'user' ? 'tertiary' : 'secondary'
                        }
                        className="allow-selection whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6"
                      >
                        {message.content}
                      </Surface>
                      <div className="mt-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() =>
                            void navigator.clipboard.writeText(message.content)
                          }
                        >
                          <Icon name="copy" className="size-3.5" />
                          Копировать
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeMessages.length === 0 && (
                  <Surface
                    variant="secondary"
                    className="mx-auto mt-12 max-w-md p-6 text-center"
                  >
                    <h3 className="font-semibold">Пустой чат</h3>
                    <p className="mt-2 text-sm leading-6 app-muted">
                      {providers.length > 0
                        ? 'Выберите подключение и отправьте сообщение.'
                        : 'Сначала добавьте провайдера во вкладке «Телескоп».'}
                    </p>
                  </Surface>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <Surface
              variant="secondary"
              className="shrink-0 rounded-none p-3 sm:p-4"
            >
              <div className="mx-auto w-full max-w-4xl">
                {sendError && (
                  <p className="allow-selection mb-2 text-sm app-danger">
                    {sendError}
                  </p>
                )}
                {!activeProvider && providers.length > 0 && (
                  <p className="mb-2 text-sm app-muted">
                    Выберите провайдера в заголовке чата.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <TextArea
                    fullWidth
                    variant="secondary"
                    rows={2}
                    value={draft}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setDraft(event.target.value)
                    }
                    onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                      if (
                        sendOnEnter &&
                        event.key === 'Enter' &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={
                      activeProvider
                        ? `Сообщение для ${activeProvider.name}`
                        : 'Выберите провайдера'
                    }
                    disabled={!activeProvider || sending}
                    className="max-h-44 min-h-12 resize-y"
                  />
                  <Button
                    isIconOnly
                    variant="primary"
                    className="shrink-0"
                    isDisabled={!draft.trim() || !activeProvider || sending}
                    isPending={sending}
                    aria-label="Отправить сообщение"
                    onPress={() => void send()}
                  >
                    <Icon name="send" className="size-5" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[0.68rem] app-muted">
                  <span>
                    {activeProvider
                      ? `${activeProvider.model} · max ${activeProvider.maxTokens}`
                      : 'Настройки берутся из подключения'}
                  </span>
                  <span>
                    {sendOnEnter ? 'Enter — отправить' : 'Отправка кнопкой'}
                  </span>
                </div>
              </div>
            </Surface>
          </>
        ) : (
          <div className="grid h-full place-items-center p-5">
            <Surface variant="secondary" className="max-w-md p-7 text-center">
              <h2 className="text-lg font-semibold">Нет чатов</h2>
              <p className="mt-2 text-sm app-muted">
                Создайте чат, чтобы начать.
              </p>
              <Button className="mt-5" variant="primary" onPress={onNewChat}>
                <Icon name="plus" className="size-4" /> Новый чат
              </Button>
            </Surface>
          </div>
        )}
      </section>

      <UiModal
        isOpen={Boolean(renameTarget)}
        onOpenChange={(open) => !open && !working && setRenameTarget(null)}
        title="Переименовать чат"
        description="Название хранится локально."
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setRenameTarget(null)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={working}
              isDisabled={!renameValue.trim()}
              onPress={() => void commitRename()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <Input
          fullWidth
          variant="secondary"
          value={renameValue}
          maxLength={120}
          autoFocus
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setRenameValue(event.target.value)
          }
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') void commitRename();
          }}
          aria-label="Новое название чата"
        />
        {actionError && (
          <p className="allow-selection mt-2 text-sm app-danger">
            {actionError}
          </p>
        )}
      </UiModal>

      <UiModal
        isOpen={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && !working && setConfirmTarget(null)}
        title={
          confirmTarget?.type === 'delete'
            ? 'Удалить чат?'
            : 'Очистить историю?'
        }
        description={
          confirmTarget?.type === 'delete'
            ? `Чат «${confirmTarget.chat.title}» и все сообщения будут удалены.`
            : `Все сообщения из чата «${confirmTarget?.chat.title ?? ''}» будут удалены.`
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setConfirmTarget(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={() => void commitDestructiveAction()}
            >
              {confirmTarget?.type === 'delete' ? 'Удалить' : 'Очистить'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 app-muted">
          Это действие нельзя отменить.
        </p>
        {actionError && (
          <p className="allow-selection mt-2 text-sm app-danger">
            {actionError}
          </p>
        )}
      </UiModal>
    </div>
  );
}
