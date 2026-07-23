import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import type { Chat, Message } from '../types';

export function ChatsScreen({
  chats,
  messages,
  activeChatId,
  onSelectChat,
  onNewChat,
  onSend,
  sendOnEnter,
}: {
  chats: Chat[];
  messages: Message[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onSend: (content: string) => void;
  sendOnEnter: boolean;
}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [showHistoryMobile, setShowHistoryMobile] = useState(true);

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        `${chat.title} ${chat.preview}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [chats, query],
  );
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0];
  const activeMessages = messages.filter(
    (message) => message.chatId === activeChat?.id,
  );

  const selectChat = (id: string) => {
    onSelectChat(id);
    setShowHistoryMobile(false);
  };

  const send = () => {
    const value = draft.trim();
    if (!value) return;
    onSend(value);
    setDraft('');
  };

  return (
    <div
      className={`chat-layout ${showHistoryMobile ? 'show-history' : 'show-conversation'}`}
    >
      <aside className="chat-history panel">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Локальная история</span>
            <h1>Чаты</h1>
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
            placeholder="Поиск по чатам"
          />
        </label>
        <div className="chat-list scroll-area">
          {filteredChats.map((chat) => (
            <button
              className={`chat-list-item ${chat.id === activeChat?.id ? 'active' : ''}`}
              key={chat.id}
              onClick={() => selectChat(chat.id)}
            >
              <span className="chat-avatar">{chat.title.slice(0, 1)}</span>
              <span className="chat-list-copy">
                <span className="chat-list-title">
                  {chat.title}
                  {chat.pinned && (
                    <span className="pin-dot" title="Закреплён" />
                  )}
                </span>
                <span className="chat-preview">{chat.preview}</span>
              </span>
              <span className="chat-meta">{chat.updatedAt}</span>
            </button>
          ))}
        </div>
        <div className="storage-note">
          <Icon name="database" />
          <span>
            <strong>SQLite локально</strong>Синхронизацию можно добавить позже
          </span>
        </div>
      </aside>

      <section className="conversation panel">
        <header className="conversation-header">
          <button
            className="mobile-back-button"
            onClick={() => setShowHistoryMobile(true)}
            aria-label="К списку чатов"
          >
            ‹
          </button>
          <div className="conversation-avatar">AI</div>
          <div className="conversation-title">
            <h2>{activeChat?.title ?? 'Новый чат'}</h2>
            <span>
              <i /> Mistral · mistral-large-latest
            </span>
          </div>
          <button className="icon-button" aria-label="Меню чата">
            <Icon name="more" />
          </button>
        </header>

        <div className="messages scroll-area">
          <div className="context-chip">
            <Icon name="sparkles" /> Стеклянное небо · Лира Вейл · 3 записи
            ворлдбука
          </div>
          {activeMessages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <div className="message-avatar">
                {message.role === 'user' ? 'Я' : 'AI'}
              </div>
              <div className="message-body">
                <div className="message-bubble">{message.content}</div>
                <div className="message-actions">
                  <span>{message.createdAt}</span>
                  {message.role === 'assistant' && (
                    <button>
                      <Icon name="copy" /> Копировать
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {activeMessages.length === 0 && (
            <div className="empty-state">
              <span className="empty-orbit">
                <Icon name="sparkles" />
              </span>
              <h3>Начни новый диалог</h3>
              <p>Выбери провайдера, модель и контекст из своей галактики.</p>
            </div>
          )}
        </div>

        <footer className="composer-wrap">
          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (sendOnEnter && event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Напиши сообщение..."
              rows={1}
            />
            <button
              className="send-button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Отправить"
            >
              <Icon name="send" />
            </button>
          </div>
          <div className="composer-meta">
            <button>
              <Icon name="brain" /> Температура 0.8
            </button>
            <span>
              {sendOnEnter
                ? 'Enter — отправить · Shift+Enter — новая строка'
                : 'Ctrl+Enter или кнопка — отправить'}
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
}
