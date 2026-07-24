import { useEffect, useMemo, useRef, useState } from 'react';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Chat, ChatConfigInput } from '../../types';
import { ChatComposer } from './components/ChatComposer';
import { ChatDialogs } from './components/ChatDialogs';
import { ChatSetupModal } from './components/ChatSetupModal';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import type { ChatAction, ChatsScreenProps } from './types';
import { draftKey } from './utils';

export function ChatsScreen({
  chats,
  messages,
  providers,
  galaxyItems,
  activeChatId,
  chatSidebarWidth,
  onChatSidebarWidthPreview,
  onChatSidebarWidthCommit,
  onSelectChat,
  onNewChat,
  onUpdateChat,
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
  const [configTarget, setConfigTarget] = useState<Chat | 'new' | null>(null);
  const [configError, setConfigError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'clear' | 'delete';
    chat: Chat;
  } | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);

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
    if (!activeChat?.id) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile && showHistoryMobile) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      const scrollToBottom = () => {
        const scroller = messageScrollRef.current;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      };
      scrollToBottom();
      secondFrame = window.requestAnimationFrame(scrollToBottom);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activeMessages.length, activeChat?.id, showHistoryMobile]);

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
    if (action === 'configure') {
      setConfigError('');
      setConfigTarget(chat);
      return;
    }
    if (action === 'duplicate') {
      setWorking(true);
      void onNewChat({
        title: `${chat.title} — копия`,
        providerId: chat.providerId,
        personaId: chat.personaId,
        characterId: chat.characterId,
        universeId: chat.universeId,
        worldbookIds: [...chat.worldbookIds],
      })
        .then(() => setShowHistoryMobile(false))
        .catch((error) => setActionError(String(error)))
        .finally(() => setWorking(false));
      return;
    }
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

  const saveConfig = async (input: ChatConfigInput) => {
    if (!configTarget || working) return;
    setWorking(true);
    setConfigError('');
    try {
      if (configTarget === 'new') {
        await onNewChat(input);
        setShowHistoryMobile(false);
      } else {
        await onUpdateChat(configTarget.id, input);
      }
      setConfigTarget(null);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
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
        onNewChat={() => {
          setConfigError('');
          setConfigTarget('new');
        }}
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
              galaxyItems={galaxyItems}
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
              scrollRef={messageScrollRef}
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
              description="Создайте чат и сразу выберите его ролевой контекст."
            />
          </div>
        )}
      </section>

      <ChatSetupModal
        isOpen={configTarget != null}
        chat={configTarget === 'new' ? null : configTarget}
        galaxyItems={galaxyItems}
        providers={providers}
        saving={working}
        error={configError}
        onOpenChange={(open) => !open && setConfigTarget(null)}
        onSubmit={(input) => void saveConfig(input)}
      />

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
