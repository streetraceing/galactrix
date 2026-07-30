import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useVisualViewportMetrics } from '../../hooks/useVisualViewportMetrics';
import { toast } from '../../i18n/toast';
import { galaxyItemAvatar } from '../../lib/avatar';
import { isAndroidPlatform, isMobilePlatform } from '../../lib/platform';
import { resolveProfileName } from '../../lib/profile';
import type { Chat, ChatConfigInput, Message } from '../../types';
import { activeChatById, groupMessagesByChat } from './chatMessages';
import { ChatComposer } from './components/ChatComposer';
import { ChatDialogs } from './components/ChatDialogs';
import { ChatSetupModal } from './components/ChatSetupModal';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import type { ChatAction, ChatsScreenProps } from './types';
import { draftKey } from './utils';
import { useTranslation } from 'react-i18next';

const EMPTY_MESSAGES: Message[] = [];

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
  onContinueMessage,
  onSelectMessageVariant,
  onSend,
  onCancelGeneration,
  sendOnEnter,
  saveDrafts,
  chatViewMode,
  showMessageAvatars,
  showMessageTimestamps,
  responseLanguage,
  sending,
}: ChatsScreenProps) {
  const { t } = useTranslation(['chats', 'common']);
  const isMobile = isMobilePlatform();
  const usesNativeImeInsets = isAndroidPlatform();
  const isNarrowDesktop = useMediaQuery('(max-width: 820px)');
  const isSinglePane = isMobile || isNarrowDesktop;
  const { bottomInset: keyboardInset, viewportHeight } =
    useVisualViewportMetrics(isMobile && isSinglePane && isChatOpen);
  const [pendingMessage, setPendingMessage] = useState<{
    chatId: string;
    content: string;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [configTarget, setConfigTarget] = useState<Chat | 'new' | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'clear' | 'delete';
    chat: Chat;
  } | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const sendInFlightRef = useRef(false);

  const activeChat = activeChatById(chats, activeChatId);
  const messagesByChat = useMemo(
    () => groupMessagesByChat(messages),
    [messages],
  );
  const activeMessages = activeChat
    ? (messagesByChat.get(activeChat.id) ?? EMPTY_MESSAGES)
    : EMPTY_MESSAGES;
  const configChatId =
    configTarget && configTarget !== 'new' ? configTarget.id : undefined;
  const configRememberedMessages = configChatId
    ? (messagesByChat.get(configChatId) ?? EMPTY_MESSAGES).filter(
        (message) => message.remembered,
      )
    : EMPTY_MESSAGES;
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
  const displayProfileName = resolveProfileName(
    profileName,
    t('user.defaultName', { ns: 'common' }),
  );
  const activeUserName = activePersona?.name || displayProfileName;
  const shouldAutoFocusComposer =
    !isMobile &&
    (!isSinglePane || isChatOpen) &&
    configTarget == null &&
    renameTarget == null &&
    confirmTarget == null;
  const showChatError = useCallback(
    (error: unknown) =>
      toast.danger(t('errors.chatActionFailed'), {
        description: error instanceof Error ? error.message : String(error),
        timeout: 3_500,
      }),
    [t],
  );

  useEffect(() => {
    const openNewChat = () => {
      setConfigTarget('new');
    };
    window.addEventListener('galactrix:new-chat', openNewChat);
    return () => window.removeEventListener('galactrix:new-chat', openNewChat);
  }, []);

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

  const send = useCallback(
    async (value: string) => {
      if (
        !activeChat ||
        !activeProvider ||
        sending ||
        sendInFlightRef.current
      ) {
        return;
      }
      sendInFlightRef.current = true;
      setPendingMessage({ chatId: activeChat.id, content: value });
      try {
        await onSend(value);
      } catch (error) {
        showChatError(error);
        throw error;
      } finally {
        sendInFlightRef.current = false;
        setPendingMessage(null);
      }
    },
    [activeChat, activeProvider, onSend, sending, showChatError],
  );

  const cancelGeneration = useCallback(async () => {
    try {
      await onCancelGeneration();
    } catch (error) {
      showChatError(error);
    }
  }, [onCancelGeneration, showChatError]);

  const handleAction = useCallback(
    (action: ChatAction, chat: Chat) => {
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
    },
    [onCloneChat, onSetPinned, showChatError, t],
  );
  const openNewChat = useCallback(() => setConfigTarget('new'), []);

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
        chats={chats}
        galaxyItems={galaxyItems}
        activeChatId={activeChat?.id ?? ''}
        width={chatSidebarWidth}
        isVisibleMobile={!isChatOpen}
        isSinglePane={isSinglePane}
        onSelect={onSelectChat}
        onNewChat={openNewChat}
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
              chatId={activeChat.id}
              messages={activeMessages}
              provider={activeProvider}
              assistantName={activeCharacterName}
              assistantAvatar={galaxyItemAvatar(activeCharacter)}
              userName={activeUserName}
              userAvatar={galaxyItemAvatar(activePersona) ?? profileAvatar}
              pendingMessage={
                pendingMessage?.chatId === activeChat.id
                  ? pendingMessage.content
                  : ''
              }
              sending={sending}
              viewMode={chatViewMode}
              showAvatars={showMessageAvatars}
              showTimestamps={showMessageTimestamps}
              providersAvailable={providers.length > 0}
              scrollRef={messageScrollRef}
              onBranch={onBranchMessage}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onRemember={onRememberMessage}
              onRegenerate={onRegenerateMessage}
              onContinue={onContinueMessage}
              onSelectVariant={onSelectMessageVariant}
            />
            <ChatComposer
              key={activeChat.id}
              chatId={activeChat.id}
              provider={activeProvider}
              sending={sending}
              sendOnEnter={sendOnEnter}
              saveDrafts={saveDrafts}
              shouldAutoFocus={shouldAutoFocusComposer}
              focusKey={`${activeChat.id}:${isChatOpen}`}
              onSend={send}
              onCancel={cancelGeneration}
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
        profileName={displayProfileName}
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
