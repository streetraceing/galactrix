import {
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  ListBox,
  Select,
  Surface,
  TextArea,
} from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, Key, KeyboardEvent } from 'react';
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
          className="app-chat-action-trigger"
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
            <span className="app-accent flex items-center gap-2">
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
            <span className="app-danger flex items-center gap-2">
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
    <div className="app-chat-layout">
      <aside
        className={`${showHistoryMobile ? 'flex' : 'hidden'} app-chat-rail md:flex bg-transparent`}
        style={
          {
            '--chat-sidebar-width': `${chatSidebarWidth}px`,
          } as CSSProperties
        }
      >
        <header className="app-chat-rail-header">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Чаты</h1>
              {chats.length > 0 && (
                <Chip size="sm" variant="soft">
                  {chats.length}
                </Chip>
              )}
            </div>
            <p className="app-muted mt-1 text-xs">История разговоров</p>
          </div>
          <Button
            isIconOnly
            size="lg"
            variant="primary"
            aria-label="Новый чат"
            onPress={onNewChat}
          >
            <Icon name="plus" className="size-5" />
          </Button>
        </header>

        <div className="px-3 pb-2">
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

        <div className="app-chat-list scrollbar-thin">
          {filteredChats.map((chat) => {
            const selected = chat.id === activeChat?.id;
            return (
              <Surface
                key={chat.id}
                variant={selected ? 'tertiary' : 'secondary'}
                className={`app-chat-row ${selected ? 'is-selected' : ''}`}
              >
                <Button
                  variant="ghost"
                  className="app-chat-row-main h-auto min-w-0 flex-1 justify-start gap-3 px-3 py-3 text-left"
                  onPress={() => selectChat(chat.id)}
                >
                  <span className="app-chat-avatar">
                    <Icon name="chats" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <strong className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {chat.title}
                      </strong>
                      {chat.pinned && (
                        <Icon
                          name="pin"
                          className="app-accent size-3.5 shrink-0"
                        />
                      )}
                    </span>
                    <span className="app-muted mt-1 block truncate text-xs leading-5">
                      {chat.preview || 'Сообщений пока нет'}
                    </span>
                  </span>
                  <span className="app-muted self-start whitespace-nowrap pt-0.5 text-[0.67rem]">
                    {chat.updatedAt}
                  </span>
                </Button>
                <ChatActions chat={chat} onAction={handleAction} />
              </Surface>
            );
          })}

          {filteredChats.length === 0 && (
            <div className="app-empty-state min-h-64">
              <span className="app-empty-icon">
                <Icon name={query ? 'search' : 'chats'} className="size-6" />
              </span>
              <h3>{query ? 'Ничего не найдено' : 'Чатов пока нет'}</h3>
              <p>
                {query
                  ? 'Попробуйте изменить поисковый запрос.'
                  : 'Создайте новый чат, чтобы начать разговор.'}
              </p>
              {!query && (
                <Button className="mt-4" variant="primary" onPress={onNewChat}>
                  <Icon name="plus" className="size-4" /> Новый чат
                </Button>
              )}
            </div>
          )}

          {actionError && (
            <Surface
              variant="tertiary"
              className="allow-selection mx-1 mt-2 p-3 text-sm"
            >
              <span className="app-danger">{actionError}</span>
            </Surface>
          )}
        </div>
      </aside>

      <ResizeHandle
        value={chatSidebarWidth}
        min={248}
        max={560}
        label="Изменить ширину списка чатов"
        onChange={onChatSidebarWidthPreview}
        onCommit={onChatSidebarWidthCommit}
      />

      <section
        className={`${showHistoryMobile ? 'hidden' : 'flex'} app-conversation md:flex`}
      >
        {activeChat ? (
          <>
            <header className="app-conversation-header">
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
                  <h2 className="truncate text-base font-semibold tracking-[-0.015em] sm:text-lg">
                    {activeChat.title}
                  </h2>
                  {activeChat.pinned && (
                    <Icon name="pin" className="app-accent size-3.5 shrink-0" />
                  )}
                  {activeMessages.length > 0 && (
                    <Chip size="sm" variant="soft" className="hidden sm:flex">
                      {activeMessages.length}
                    </Chip>
                  )}
                </div>
                <p className="app-muted mt-0.5 truncate text-xs">
                  {activeProvider
                    ? `${activeProvider.name} · ${activeProvider.model}`
                    : 'Провайдер не выбран'}
                </p>
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
                className="hidden w-[min(22rem,34vw)] md:block"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="none" textValue="Не выбран">
                      <Label>Не выбран</Label>
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

              <ChatActions chat={activeChat} onAction={handleAction} />
            </header>

            <div className="app-conversation-canvas">
              <div className="app-messages scrollbar-thin">
                <div className="app-message-stream">
                  <div className="md:hidden">
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
                      fullWidth
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="none" textValue="Не выбран">
                            <Label>Не выбран</Label>
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

                  {activeMessages.map((message) => {
                    const isUser = message.role === 'user';
                    return (
                      <article
                        key={message.id}
                        className={`app-message-row ${isUser ? 'is-user' : ''}`}
                      >
                        <span className="app-message-avatar">
                          <Icon
                            name={isUser ? 'user' : 'sparkles'}
                            className="size-4"
                          />
                        </span>
                        <div className="app-message-content">
                          <div className="app-message-meta">
                            <strong className="font-medium">
                              {isUser
                                ? 'Вы'
                                : message.role === 'assistant'
                                  ? (activeProvider?.name ?? 'Ассистент')
                                  : 'Система'}
                            </strong>
                            <span>{message.createdAt}</span>
                          </div>
                          <Surface
                            variant={isUser ? 'tertiary' : 'secondary'}
                            className="allow-selection whitespace-pre-wrap wrap-break-word px-4 py-3 text-sm leading-6"
                          >
                            {message.content}
                          </Surface>
                          <div
                            className={`mt-1 flex ${isUser ? 'justify-start' : 'justify-end'}`}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() =>
                                void navigator.clipboard.writeText(
                                  message.content,
                                )
                              }
                            >
                              <Icon name="copy" className="size-3.5" />
                              Копировать
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {activeMessages.length === 0 && (
                    <div className="app-empty-state min-h-[55vh]">
                      <span className="app-empty-icon">
                        <Icon name="chats" className="size-6" />
                      </span>
                      <h3>Начните разговор</h3>
                      <p>
                        {providers.length > 0
                          ? activeProvider
                            ? `Сообщения будут отправляться через ${activeProvider.name}.`
                            : 'Выберите провайдера в заголовке, затем напишите сообщение.'
                          : 'Сначала добавьте провайдера во вкладке «Телескоп».'}
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            <div className="app-composer-zone">
              <div className="app-composer-inner">
                {sendError && (
                  <p className="allow-selection app-danger mb-2 px-2 text-sm">
                    {sendError}
                  </p>
                )}
                {!activeProvider && providers.length > 0 && (
                  <p className="app-muted mb-2 px-2 text-sm">
                    Выберите провайдера, чтобы отправить сообщение.
                  </p>
                )}
                <Surface variant="secondary" className="app-composer-surface">
                  <div className="flex items-end gap-2">
                    <TextArea
                      fullWidth
                      variant="secondary"
                      rows={1}
                      value={draft}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft(event.target.value)
                      }
                      onKeyDown={(
                        event: KeyboardEvent<HTMLTextAreaElement>,
                      ) => {
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
                      className="max-h-48 min-h-12 resize-y"
                    />
                    <Button
                      isIconOnly
                      size="lg"
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
                  <div className="app-composer-meta">
                    <span>
                      {activeProvider
                        ? `${activeProvider.model} · max ${activeProvider.maxTokens}`
                        : 'Настройки берутся из подключения'}
                    </span>
                    <span>
                      {sendOnEnter ? 'Enter — отправить' : 'Отправка кнопкой'}
                    </span>
                  </div>
                </Surface>
              </div>
            </div>
          </>
        ) : (
          <div className="app-empty-state h-full">
            <span className="app-empty-icon">
              <Icon name="chats" className="size-6" />
            </span>
            <h2>Нет чатов</h2>
            <p>Создайте новый чат, чтобы начать разговор.</p>
            <Button className="mt-5" variant="primary" onPress={onNewChat}>
              <Icon name="plus" className="size-4" /> Новый чат
            </Button>
          </div>
        )}
      </section>

      <UiModal
        isOpen={Boolean(renameTarget)}
        onOpenChange={(open) => !open && !working && setRenameTarget(null)}
        title="Переименовать чат"
        description="Введите новое название."
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
          <p className="allow-selection app-danger mt-2 text-sm">
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
        <p className="app-muted text-sm leading-6">
          Это действие нельзя отменить.
        </p>
        {actionError && (
          <p className="allow-selection app-danger mt-2 text-sm">
            {actionError}
          </p>
        )}
      </UiModal>
    </div>
  );
}
