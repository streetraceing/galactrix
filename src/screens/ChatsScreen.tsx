import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import type { Chat, Message, Provider } from '../types';

function draftKey(chatId: string) {
  return `galactrix:draft:${chatId}`;
}

export function ChatsScreen({
  chats,
  messages,
  providers,
  activeChatId,
  onSelectChat,
  onNewChat,
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
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
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
  const availableProviders = providers;

  useEffect(() => {
    if (!activeChat?.id) {
      setDraft('');
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

  return (
    <div
      className={`chat-layout ${showHistoryMobile ? 'show-history' : 'show-conversation'}`}
    >
      <aside className="chat-history">
        <div className="pane-header">
          <div>
            <h1>Чаты</h1>
            <span>{chats.length} локально</span>
          </div>
          <button
            className="primary-icon-button"
            onClick={onNewChat}
            aria-label="Новый чат"
          >
            <Icon name="plus" />
          </button>
        </div>

        <label className="search-field">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
          />
        </label>

        <div className="chat-list scroll-area">
          {filteredChats.map((chat) => (
            <button
              className={`chat-list-item ${chat.id === activeChat?.id ? 'active' : ''}`}
              key={chat.id}
              onClick={() => selectChat(chat.id)}
            >
              <span className="chat-list-copy">
                <span className="chat-list-title">
                  {chat.title}
                  {chat.pinned && (
                    <span className="pin-dot" title="Закреплён" />
                  )}
                </span>
                <span className="chat-preview">
                  {chat.preview || 'Сообщений пока нет'}
                </span>
              </span>
              <span className="chat-meta">{chat.updatedAt}</span>
            </button>
          ))}

          {filteredChats.length === 0 && (
            <div className="list-empty">
              <p>{query ? 'Ничего не найдено' : 'Чатов пока нет'}</p>
              {!query && (
                <button className="text-button" onClick={onNewChat}>
                  Создать первый чат
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <section className="conversation">
        {activeChat ? (
          <>
            <header className="conversation-header">
              <button
                className="mobile-back-button"
                onClick={() => setShowHistoryMobile(true)}
                aria-label="К списку чатов"
              >
                ‹
              </button>
              <div className="conversation-title">
                <h2>{activeChat.title}</h2>
                <label className="provider-select">
                  <span className="sr-only">Провайдер</span>
                  <select
                    value={activeProvider?.id ?? ''}
                    onChange={(event) =>
                      void onSetProvider(
                        activeChat.id,
                        event.target.value || undefined,
                      )
                    }
                  >
                    <option value="">Выбрать провайдера</option>
                    {availableProviders.map((provider) => (
                      <option value={provider.id} key={provider.id}>
                        {provider.name} · {provider.model}
                        {provider.status === 'connected'
                          ? ''
                          : ' · не проверен'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </header>

            <div className="messages scroll-area">
              {activeMessages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-label">
                    {message.role === 'user'
                      ? 'Вы'
                      : message.role === 'assistant'
                        ? (activeProvider?.name ?? 'Ассистент')
                        : 'Система'}
                  </div>
                  <div className="message-body">
                    <div className="message-bubble">{message.content}</div>
                    <div className="message-actions">
                      <span>{message.createdAt}</span>
                      <button
                        onClick={() =>
                          void navigator.clipboard.writeText(message.content)
                        }
                      >
                        <Icon name="copy" /> Копировать
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {activeMessages.length === 0 && (
                <div className="empty-state compact-empty">
                  <h3>Пустой чат</h3>
                  <p>
                    {availableProviders.length > 0
                      ? 'Выберите подключение и отправьте сообщение.'
                      : 'Сначала добавьте и проверьте провайдера во вкладке «Телескоп».'}
                  </p>
                </div>
              )}
            </div>

            <footer className="composer-wrap">
              {sendError && <div className="inline-error">{sendError}</div>}
              {!activeProvider && availableProviders.length > 0 && (
                <div className="inline-hint">
                  Выберите провайдера в заголовке чата.
                </div>
              )}
              <div className="composer">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
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
                  rows={1}
                  disabled={!activeProvider || sending}
                />
                <button
                  className="send-button"
                  onClick={() => void send()}
                  disabled={!draft.trim() || !activeProvider || sending}
                  aria-label="Отправить"
                >
                  {sending ? (
                    <span className="button-spinner" />
                  ) : (
                    <Icon name="send" />
                  )}
                </button>
              </div>
              <div className="composer-meta">
                {activeProvider ? (
                  <span>
                    temperature {activeProvider.temperature} · top p{' '}
                    {activeProvider.topP} · max {activeProvider.maxTokens}
                  </span>
                ) : (
                  <span>Настройки генерации берутся из подключения</span>
                )}
                <span>
                  {sendOnEnter
                    ? 'Enter — отправить'
                    : 'Используйте кнопку отправки'}
                </span>
              </div>
            </footer>
          </>
        ) : (
          <div className="empty-state conversation-empty">
            <h2>Нет чатов</h2>
            <p>История хранится локально в SQLite.</p>
            <button className="primary-button" onClick={onNewChat}>
              <Icon name="plus" /> Новый чат
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
