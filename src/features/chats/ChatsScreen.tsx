import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Chat } from '../../types';
import { ChatComposer } from './components/ChatComposer';
import { ChatDialogs } from './components/ChatDialogs';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import type { ChatAction, ChatsScreenProps } from './types';
import { draftKey } from './utils';

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
}: ChatsScreenProps) {
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
    if (saveDrafts) localStorage.setItem(draftKey(activeChat.id), draft);
    else localStorage.removeItem(draftKey(activeChat.id));
  }, [activeChat?.id, draft, saveDrafts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'instant',
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

  const handleAction = (action: ChatAction, chat: Chat) => {
    setActionError('');
    if (action === 'rename') {
      setRenameTarget(chat);
      setRenameValue(chat.title);
      return;
    }
    if (action === 'pin') {
      setWorking(true);
      void onSetPinned(chat.id, !chat.pinned)
        .catch((error) => setActionError(String(error)))
        .finally(() => setWorking(false));
      return;
    }
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
    <div className="flex h-full min-w-0 overflow-hidden bg-background">
      <ChatSidebar
        chats={filteredChats}
        activeChatId={activeChat?.id ?? ''}
        query={query}
        width={chatSidebarWidth}
        isVisibleMobile={showHistoryMobile}
        onQueryChange={setQuery}
        onSelect={selectChat}
        onNewChat={onNewChat}
        onAction={handleAction}
      />

      <ResizeHandle
        value={chatSidebarWidth}
        min={260}
        max={520}
        label="Изменить ширину списка чатов"
        onChange={onChatSidebarWidthPreview}
        onCommit={onChatSidebarWidthCommit}
      />

      <section
        className={`${showHistoryMobile ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}
      >
        {activeChat ? (
          <>
            <ConversationHeader
              chat={activeChat}
              providers={providers}
              onBack={() => setShowHistoryMobile(true)}
              onSetProvider={(providerId) =>
                void onSetProvider(activeChat.id, providerId)
              }
              onAction={handleAction}
            />
            <MessageList
              messages={activeMessages}
              provider={activeProvider}
              providersAvailable={providers.length > 0}
              endRef={messagesEndRef}
            />
            <ChatComposer
              draft={draft}
              provider={activeProvider}
              sending={sending}
              sendOnEnter={sendOnEnter}
              error={sendError}
              providersAvailable={providers.length > 0}
              onDraftChange={setDraft}
              onSend={() => void send()}
            />
          </>
        ) : (
          <div className="grid h-full place-items-center p-4 sm:p-6">
            <EmptyState
              icon="chats"
              title="Нет чатов"
              description="Создайте новый чат, чтобы начать разговор."
              action={{
                label: 'Новый чат',
                onPress: onNewChat,
                icon: <Icon name="plus" className="size-4" />,
              }}
            />
          </div>
        )}
      </section>

      <ChatDialogs
        renameTarget={renameTarget}
        renameValue={renameValue}
        confirmTarget={confirmTarget}
        working={working}
        error={actionError}
        onRenameValueChange={setRenameValue}
        onCommitRename={() => void commitRename()}
        onCommitDestructive={() => void commitDestructiveAction()}
        onCloseRename={() => setRenameTarget(null)}
        onCloseConfirm={() => setConfirmTarget(null)}
      />
    </div>
  );
}
