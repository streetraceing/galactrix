import { toast } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useVisualViewportMetrics } from '../../hooks/useVisualViewportMetrics';
import { galaxyItemAvatar } from '../../lib/avatar';
import { isAndroidPlatform, isMobilePlatform } from '../../lib/platform';
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
  profileName,
  profileAvatar,
  activeChatId,
  isChatOpen,
  chatSidebarWidth,
  onChatSidebarWidthPreview,
  onChatSidebarWidthCommit,
  onSelectChat,
  onCloseChat,
  onNewChat,
  onUpdateChat,
  onRenameChat,
  onDeleteChat,
  onSetPinned,
  onClearChat,
  onCloneChat,
  onBranchMessage,
  onEditMessage,
  onDeleteMessage,
  onRememberMessage,
  onRegenerateMessage,
  onSelectMessageVariant,
  onSend,
  sendOnEnter,
  saveDrafts,
  sending,
}: ChatsScreenProps) {
  const isMobile = isMobilePlatform();
  const usesNativeImeInsets = isAndroidPlatform();
  const isNarrowDesktop = useMediaQuery('(max-width: 820px)');
  const isSinglePane = isMobile || isNarrowDesktop;
  const { bottomInset: keyboardInset, viewportHeight } =
    useVisualViewportMetrics(isMobile && isSinglePane && isChatOpen);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
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
  const configChatId =
    configTarget && configTarget !== 'new' ? configTarget.id : undefined;
  const configRememberedMessages = configChatId
    ? messages.filter(
        (message) => message.chatId === configChatId && message.remembered,
      )
    : [];
  const activeProvider = providers.find(
    (provider) => provider.id === activeChat?.providerId,
  );
  const activeCharacter = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === activeChat?.characterId,
  );
  const activePersona = galaxyItems.find(
    (item) => item.kind === 'persona' && item.id === activeChat?.personaId,
  );
  const activeCharacterName = activeCharacter?.name ?? 'Ассистент';
  const activeUserName = (activePersona?.name ?? profileName.trim()) || 'Вы';

  useEffect(() => {
    const openNewChat = () => {
      setConfigError('');
      setConfigTarget('new');
    };
    window.addEventListener('galactrix:new-chat', openNewChat);
    return () => window.removeEventListener('galactrix:new-chat', openNewChat);
  }, []);

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
    if (saveDrafts) localStorage.setItem(draftKey(activeChat.id), draft);
    else localStorage.removeItem(draftKey(activeChat.id));
  }, [activeChat?.id, draft, saveDrafts]);

  useEffect(() => {
    if (!activeChat?.id) return;
    if (isSinglePane && !isChatOpen) return;

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
  }, [
    activeMessages.length,
    activeChat?.id,
    isChatOpen,
    isSinglePane,
    pendingMessage,
    sending,
  ]);

  useEffect(() => {
    if (!viewportHeight) return;
    const frame = window.requestAnimationFrame(() => {
      const scroller = messageScrollRef.current;
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [keyboardInset, viewportHeight]);

  const selectChat = (id: string) => {
    onSelectChat(id);
  };

  const send = async () => {
    const value = draft.trim();
    if (!value || !activeChat || !activeProvider || sending) return;
    setSendError('');
    setPendingMessage(value);
    setDraft('');
    try {
      await onSend(value);
      localStorage.removeItem(draftKey(activeChat.id));
    } catch (error) {
      setDraft((current) => current || value);
      setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingMessage('');
    }
  };

  const handleAction = (action: ChatAction, chat: Chat) => {
    setActionError('');
    if (action === 'configure') {
      setConfigError('');
      setConfigTarget(chat);
      return;
    }
    if (action === 'duplicate' || action === 'duplicate-with-messages') {
      setWorking(true);
      void onCloneChat(chat.id, action === 'duplicate-with-messages')
        .then(() => toast.success('Копия чата создана'))
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
        .then(() =>
          toast.success(chat.pinned ? 'Чат откреплён' : 'Чат закреплён'),
        )
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
        toast.success('Новый чат создан');
      } else {
        await onUpdateChat(configTarget.id, input);
        toast.success('Настройки чата сохранены');
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
      toast.success('Чат переименован');
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
        toast.success('Чат удалён');
      } else {
        await onClearChat(confirmTarget.chat.id);
        toast.success('История чата очищена');
      }
      setConfirmTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-1 h-full min-w-0 overflow-hidden bg-background">
      <ChatSidebar
        chats={filteredChats}
        galaxyItems={galaxyItems}
        activeChatId={activeChat?.id ?? ''}
        query={query}
        width={chatSidebarWidth}
        isVisibleMobile={!isChatOpen}
        isSinglePane={isSinglePane}
        onQueryChange={setQuery}
        onSelect={selectChat}
        onNewChat={() => {
          setConfigError('');
          setConfigTarget('new');
        }}
        onAction={handleAction}
      />

      {!isSinglePane ? (
        <ResizeHandle
          value={chatSidebarWidth}
          min={260}
          max={520}
          className="max-[1300px]:hidden"
          label="Изменить ширину списка чатов"
          onChange={onChatSidebarWidthPreview}
          onCommit={onChatSidebarWidthCommit}
        />
      ) : null}

      <section
        className={`${isSinglePane && !isChatOpen ? 'hidden' : 'flex'} ${isSinglePane && isChatOpen ? 'mobile-chat-enter' : ''} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
        style={
          keyboardInset > 0 && !usesNativeImeInsets
            ? {
                paddingBottom: keyboardInset,
              }
            : undefined
        }
      >
        {activeChat ? (
          <>
            <ConversationHeader
              chat={activeChat}
              galaxyItems={galaxyItems}
              showBack={isSinglePane}
              onBack={onCloseChat}
              onAction={handleAction}
            />
            <MessageList
              messages={activeMessages}
              provider={activeProvider}
              assistantName={activeCharacterName}
              assistantAvatar={galaxyItemAvatar(activeCharacter)}
              userName={activeUserName}
              userAvatar={galaxyItemAvatar(activePersona) ?? profileAvatar}
              pendingMessage={pendingMessage}
              sending={sending}
              providersAvailable={providers.length > 0}
              scrollRef={messageScrollRef}
              onBranch={async (messageId) => {
                await onBranchMessage(messageId);
              }}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onRemember={onRememberMessage}
              onRegenerate={onRegenerateMessage}
              onSelectVariant={onSelectMessageVariant}
            />
            <ChatComposer
              draft={draft}
              provider={activeProvider}
              sending={sending}
              sendOnEnter={sendOnEnter}
              error={sendError}
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
        profileName={profileName}
        rememberedMessages={configRememberedMessages}
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
