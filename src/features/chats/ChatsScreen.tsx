import { useEffect, useMemo, useRef, useState } from 'react';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useVisualViewportMetrics } from '../../hooks/useVisualViewportMetrics';
import { toast } from '../../i18n/toast';
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
import { useTranslation } from 'react-i18next';

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
  chatViewMode,
  showMessageAvatars,
  showMessageTimestamps,
  responseLanguage,
  sending,
}: ChatsScreenProps) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const usesNativeImeInsets = isAndroidPlatform();
  const isNarrowDesktop = useMediaQuery('(max-width: 820px)');
  const isSinglePane = isMobile || isNarrowDesktop;
  const { bottomInset: keyboardInset, viewportHeight } =
    useVisualViewportMetrics(isMobile && isSinglePane && isChatOpen);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [configTarget, setConfigTarget] = useState<Chat | 'new' | null>(null);
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
  const activeCharacterName =
    activeCharacter?.name ?? t('chatsScreen.assistant');
  const activeUserName =
    (activePersona?.name ?? profileName.trim()) || t('chatsScreen.you');
  const shouldAutoFocusComposer =
    !isMobile &&
    (!isSinglePane || isChatOpen) &&
    configTarget == null &&
    renameTarget == null &&
    confirmTarget == null;
  const showChatError = (error: unknown) =>
    toast.danger(t('errors.chatActionFailed'), {
      description: error instanceof Error ? error.message : String(error),
      timeout: 3_500,
    });

  useEffect(() => {
    const openNewChat = () => {
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
    setPendingMessage(value);
    setDraft('');
    try {
      await onSend(value);
      localStorage.removeItem(draftKey(activeChat.id));
    } catch (error) {
      setDraft((current) => current || value);
      showChatError(error);
    } finally {
      setPendingMessage('');
    }
  };

  const handleAction = (action: ChatAction, chat: Chat) => {
    if (action === 'configure') {
      setConfigTarget(chat);
      return;
    }
    if (action === 'duplicate' || action === 'duplicate-with-messages') {
      setWorking(true);
      void onCloneChat(chat.id, action === 'duplicate-with-messages')
        .then(() => toast.success(t('chatsScreen.chatCopyCreated')))
        .catch(showChatError)
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
          toast.success(
            chat.pinned
              ? t('chatsScreen.chatUnpinned')
              : t('chatsScreen.chatPinned'),
          ),
        )
        .catch(showChatError)
        .finally(() => setWorking(false));
      return;
    }
    setConfirmTarget({ type: action, chat });
  };

  const saveConfig = async (input: ChatConfigInput) => {
    if (!configTarget || working) return;
    setWorking(true);
    try {
      if (configTarget === 'new') {
        await onNewChat(input);
        toast.success(t('chatsScreen.newChatCreated'));
      } else {
        await onUpdateChat(configTarget.id, input);
        toast.success(t('chatsScreen.chatSettingsSaved'));
      }
      setConfigTarget(null);
    } catch (error) {
      showChatError(error);
    } finally {
      setWorking(false);
    }
  };

  const commitRename = async () => {
    const title = renameValue.trim();
    if (!renameTarget || !title || working) return;
    setWorking(true);
    try {
      await onRenameChat(renameTarget.id, title);
      setRenameTarget(null);
      toast.success(t('chatsScreen.chatRenamed'));
    } catch (error) {
      showChatError(error);
    } finally {
      setWorking(false);
    }
  };

  const commitDestructiveAction = async () => {
    if (!confirmTarget || working) return;
    setWorking(true);
    try {
      if (confirmTarget.type === 'delete') {
        localStorage.removeItem(draftKey(confirmTarget.chat.id));
        await onDeleteChat(confirmTarget.chat.id);
        toast.success(t('chatsScreen.chatDeleted'));
      } else {
        await onClearChat(confirmTarget.chat.id);
        toast.success(t('chatsScreen.chatHistoryCleared'));
      }
      setConfirmTarget(null);
    } catch (error) {
      showChatError(error);
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
          label={t('chatsScreen.changeChatListWidth')}
          onChange={onChatSidebarWidthPreview}
          onCommit={onChatSidebarWidthCommit}
          shift
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
              provider={activeProvider}
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
              viewMode={chatViewMode}
              showAvatars={showMessageAvatars}
              showTimestamps={showMessageTimestamps}
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
              shouldAutoFocus={shouldAutoFocusComposer}
              focusKey={`${activeChat.id}:${isChatOpen}`}
              onDraftChange={setDraft}
              onSend={() => void send()}
            />
          </>
        ) : (
          <div className="grid h-full place-items-center p-4 sm:p-6">
            <EmptyState
              icon="chats"
              title={t('chatsScreen.noChats')}
              description={t(
                'chatsScreen.createAChatAndChooseItsRoleplayContextImmediately',
              )}
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
        responseLanguage={responseLanguage}
        rememberedMessages={configRememberedMessages}
        saving={working}
        onOpenChange={(open) => !open && setConfigTarget(null)}
        onSubmit={(input) => void saveConfig(input)}
      />

      <ChatDialogs
        renameTarget={renameTarget}
        renameValue={renameValue}
        confirmTarget={confirmTarget}
        working={working}
        onRenameValueChange={setRenameValue}
        onCommitRename={() => void commitRename()}
        onCommitDestructive={() => void commitDestructiveAction()}
        onCloseRename={() => setRenameTarget(null)}
        onCloseConfirm={() => setConfirmTarget(null)}
      />
    </div>
  );
}
