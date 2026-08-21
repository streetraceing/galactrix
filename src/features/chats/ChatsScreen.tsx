import { Button } from '@heroui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EmptyState } from '../../components/ui/EmptyState';
import { UiModal } from '../../components/ui/UiModal';
import { useContextSelection } from '../../hooks/useContextSelection';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileBackEntry } from '../../hooks/useMobileBackEntry';
import { useVisualViewportMetrics } from '../../hooks/useVisualViewportMetrics';
import { toast } from '../../i18n/toast';
import { galaxyItemAvatar } from '../../lib/avatar';
import { errorMessage } from '../../lib/errors';
import {
  consumeChatQuickCreate,
  subscribeChatQuickCreate,
} from '../../lib/chatQuickCreate';
import { isAndroidPlatform, isMobilePlatform } from '../../lib/platform';
import { resolveProfileName } from '../../lib/profile';
import { removeStorageItem } from '../../lib/storage';
import type { Chat, ChatConfigInput, Message } from '../../types';
import { activeChatById, groupMessagesByChat } from './chatMessages';
import { ChatComposer } from './components/ChatComposer';
import { ChatDialogs } from './components/ChatDialogs';
import { ChatSetupModal } from './components/ChatSetupModal';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import {
  MessageList,
  type MessageResponseActionRequest,
} from './components/MessageList';
import type { ChatAction, ChatsScreenProps } from './types';
import { draftKey } from './utils';
import { useTranslation } from 'react-i18next';

const EMPTY_MESSAGES: Message[] = [];

export function ChatsScreen({
  chats,
  messages,
  providers,
  galaxyItems,
  aiModules,
  profileName,
  profileAvatar,
  activeChatId,
  isChatOpen,
  chatListRequest,
  chatMaximized,
  chatSidebarWidth,
  onChatSidebarWidthPreview,
  onChatSidebarWidthCommit,
  onSelectChat,
  onCloseChat,
  onChatMaximizedChange,
  onNewChat,
  onUpdateChat,
  onRenameChat,
  onDeleteChat,
  onSetPinned,
  onSetArchived,
  onClearChat,
  onCloneChat,
  onBranchMessage,
  onEditMessage,
  onDeleteMessage,
  onDeleteMessages,
  onRewindMessage,
  onRememberMessage,
  onRegenerateMessage,
  onContinueMessage,
  onSelectMessageVariant,
  onSend,
  onCancelGeneration,
  sendOnEnter,
  focusComposerAfterSend,
  saveDrafts,
  chatViewMode,
  showMessageAvatars,
  showMessageTimestamps,
  responseLanguage,
  sending,
  activeMessageGeneration,
}: ChatsScreenProps) {
  const { t } = useTranslation(['chats', 'common']);
  const isMobile = isMobilePlatform();
  const usesNativeImeInsets = isAndroidPlatform();
  const isNarrowDesktop = useMediaQuery('(max-width: 820px)');
  const isSinglePane = isMobile || isNarrowDesktop;
  const { bottomInset: keyboardInset, viewportHeight: keyboardViewportHeight } =
    useVisualViewportMetrics(isMobile && isSinglePane && isChatOpen);
  const [working, setWorking] = useState(false);
  const [archiveMode, setArchiveMode] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const archiveScopeIds = useMemo(
    () =>
      chats
        .filter((chat) => Boolean(chat.archived) === archiveMode)
        .map((chat) => chat.id),
    [archiveMode, chats],
  );
  const chatSelection = useContextSelection(archiveScopeIds);
  const [scrollToBottomRequest, setScrollToBottomRequest] = useState(0);
  const [messageSelectionActive, setMessageSelectionActive] = useState(false);
  const [clearMessageSelectionRequest, setClearMessageSelectionRequest] =
    useState(0);
  const [responseActionRequest, setResponseActionRequest] =
    useState<MessageResponseActionRequest | null>(null);
  const [focusComposerRequest, setFocusComposerRequest] = useState(0);
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [configTarget, setConfigTarget] = useState<Chat | 'new' | null>(null);
  const [newChatCharacterId, setNewChatCharacterId] = useState<string>();
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'clear' | 'delete';
    chat: Chat;
  } | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const previousChatListRequestRef = useRef(chatListRequest);
  const sendInFlightRef = useRef(false);
  const responseActionRequestIdRef = useRef(0);

  const activeChat = activeChatById(chats, activeChatId);

  useEffect(() => {
    if (chatMaximized && (isMobile || !activeChat)) {
      onChatMaximizedChange(false);
    }
  }, [activeChat, chatMaximized, isMobile, onChatMaximizedChange]);
  const messagesByChat = useMemo(
    () => groupMessagesByChat(messages),
    [messages],
  );
  const canvasChat = activeChat;
  const canvasMessages = activeChat
    ? (messagesByChat.get(activeChat.id) ?? EMPTY_MESSAGES)
    : EMPTY_MESSAGES;
  const latestAssistantMessage = useMemo(() => {
    for (let index = canvasMessages.length - 1; index >= 0; index -= 1) {
      const message = canvasMessages[index];
      if (message.role === 'assistant' && !message.pending) return message;
    }
    return null;
  }, [canvasMessages]);
  const configChatId =
    configTarget && configTarget !== 'new' ? configTarget.id : undefined;
  const configMessages = configChatId
    ? (messagesByChat.get(configChatId) ?? EMPTY_MESSAGES)
    : EMPTY_MESSAGES;
  const activeProvider = providers.find(
    (provider) => provider.id === activeChat?.providerId,
  );
  const canvasProvider = providers.find(
    (provider) => provider.id === canvasChat?.providerId,
  );
  const canvasCharacter = galaxyItems.find(
    (item) => item.kind === 'character' && item.id === canvasChat?.characterId,
  );
  const canvasPersona = galaxyItems.find(
    (item) => item.kind === 'persona' && item.id === canvasChat?.personaId,
  );
  const displayProfileName = resolveProfileName(
    profileName,
    t('user.defaultName', { ns: 'common' }),
  );
  const canvasAssistantName =
    canvasCharacter?.name ?? t('chatsScreen.assistant');
  const canvasUserName = canvasPersona?.name || displayProfileName;
  const canvasGenerationActive = Boolean(
    sending && activeMessageGeneration?.chatId === canvasChat?.id,
  );
  const generationBusyElsewhere = Boolean(
    sending && activeMessageGeneration?.chatId !== canvasChat?.id,
  );
  const shouldAutoFocusComposer =
    !activeChat?.archived &&
    !isMobile &&
    (!isSinglePane || isChatOpen) &&
    configTarget == null &&
    renameTarget == null &&
    confirmTarget == null;
  const showChatError = useCallback(
    (error: unknown) =>
      toast.danger(t('errors.chatActionFailed'), {
        description: errorMessage(error),
        timeout: 3_500,
      }),
    [t],
  );

  const send = useCallback(
    async (value: string) => {
      if (
        !activeChat ||
        activeChat.archived ||
        !activeProvider ||
        sending ||
        sendInFlightRef.current
      ) {
        return;
      }
      sendInFlightRef.current = true;
      try {
        await onSend(value);
      } catch (error) {
        showChatError(error);
        throw error;
      } finally {
        sendInFlightRef.current = false;
      }
    },
    [activeChat, activeProvider, onSend, sending, showChatError],
  );

  const keepBottomPinnedAfterComposerResize = useCallback((delta: number) => {
    if (delta <= 0) return;
    const scroller = messageScrollRef.current;
    if (!scroller) return;

    const distanceAfterResize = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    );
    const distanceBeforeResize = Math.max(0, distanceAfterResize - delta);
    if (distanceBeforeResize > 48) return;

    scroller.scrollTop = scroller.scrollHeight;
  }, []);

  const cancelGeneration = useCallback(async () => {
    try {
      await onCancelGeneration();
    } catch (error) {
      showChatError(error);
    }
  }, [onCancelGeneration, showChatError]);

  const requestLatestResponseAction = useCallback(
    (action: MessageResponseActionRequest['action']) => {
      if (!canvasChat || !latestAssistantMessage || sending) return;
      responseActionRequestIdRef.current += 1;
      setResponseActionRequest({
        id: responseActionRequestIdRef.current,
        chatId: canvasChat.id,
        messageId: latestAssistantMessage.id,
        action,
      });
    },
    [canvasChat, latestAssistantMessage, sending],
  );

  const requestComposerFocusAfterGeneration = useCallback(() => {
    setFocusComposerRequest((current) => current + 1);
  }, []);

  const handleAction = useCallback(
    (action: ChatAction, chat: Chat) => {
      if (working) return;
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
      if (action === 'archive' || action === 'unarchive') {
        const archived = action === 'archive';
        setWorking(true);
        void onSetArchived(chat.id, archived)
          .then(() =>
            toast.success(
              archived
                ? t('chatsScreen.chatArchived')
                : t('chatsScreen.chatUnarchived'),
            ),
          )
          .catch(showChatError)
          .finally(() => setWorking(false));
        return;
      }
      if (chat.archived && action !== 'delete') return;
      setConfirmTarget({ type: action, chat });
    },
    [onCloneChat, onSetArchived, onSetPinned, showChatError, t, working],
  );
  const selectChat = useCallback(
    (chatId: string) => {
      if (chatId === activeChat?.id && isChatOpen) {
        setScrollToBottomRequest((current) => current + 1);
        return;
      }
      onSelectChat(chatId);
    },
    [activeChat?.id, isChatOpen, onSelectChat],
  );

  const toggleChatMaximized = useCallback(() => {
    onChatMaximizedChange(!chatMaximized);
  }, [chatMaximized, onChatMaximizedChange]);

  const openNewChat = useCallback(
    (characterId?: string) => {
      setArchiveMode(false);
      chatSelection.clear();
      setNewChatCharacterId(characterId);
      setConfigTarget('new');
    },
    [chatSelection.clear],
  );

  useEffect(() => {
    const consumeRequest = () => {
      const request = consumeChatQuickCreate();
      if (!request) return;
      openNewChat(request.characterId);
    };
    consumeRequest();
    return subscribeChatQuickCreate(consumeRequest);
  }, [openNewChat]);

  useEffect(() => {
    if (isSinglePane && isChatOpen) {
      chatSelection.clear();
      setArchiveMode(false);
    }
  }, [chatSelection.clear, isChatOpen, isSinglePane]);

  const changeArchiveMode = useCallback(
    (next: boolean) => {
      chatSelection.clear();
      setArchiveMode(next);
    },
    [chatSelection.clear],
  );

  useMobileBackEntry(isMobile && !isChatOpen && archiveMode, () =>
    changeArchiveMode(false),
  );

  useEffect(() => {
    if (previousChatListRequestRef.current === chatListRequest) return;
    previousChatListRequestRef.current = chatListRequest;
    changeArchiveMode(false);
    setClearMessageSelectionRequest((current) => current + 1);
  }, [changeArchiveMode, chatListRequest]);

  const archiveSelectedChats = useCallback(async () => {
    if (chatSelection.selectedIds.size === 0 || working) return;
    const ids = [...chatSelection.selectedIds];
    setWorking(true);
    try {
      for (const chatId of ids) await onSetArchived(chatId, !archiveMode);
      chatSelection.clear();
      toast.success(
        archiveMode
          ? t('selection.chatsUnarchived', { count: ids.length })
          : t('selection.chatsArchived', { count: ids.length }),
      );
    } catch (error) {
      showChatError(error);
    } finally {
      setWorking(false);
    }
  }, [
    archiveMode,
    chatSelection.clear,
    chatSelection.selectedIds,
    onSetArchived,
    showChatError,
    t,
    working,
  ]);

  const deleteSelectedChats = useCallback(async () => {
    if (chatSelection.selectedIds.size === 0 || working) return;
    const ids = [...chatSelection.selectedIds];
    setWorking(true);
    try {
      for (const chatId of ids) {
        await onDeleteChat(chatId);
        removeStorageItem(draftKey(chatId));
      }
      chatSelection.clear();
      setBulkDeleteOpen(false);
      toast.success(t('selection.chatsDeleted', { count: ids.length }));
    } catch (error) {
      showChatError(error);
    } finally {
      setWorking(false);
    }
  }, [
    chatSelection.clear,
    chatSelection.selectedIds,
    onDeleteChat,
    showChatError,
    t,
    working,
  ]);

  const handleConversationBack = useCallback(() => {
    if (messageSelectionActive) {
      setClearMessageSelectionRequest((current) => current + 1);
      return;
    }
    onCloseChat();
  }, [messageSelectionActive, onCloseChat]);

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
      setNewChatCharacterId(undefined);
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
        await onDeleteChat(confirmTarget.chat.id);
        removeStorageItem(draftKey(confirmTarget.chat.id));
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
      {!chatMaximized ? (
        <ChatSidebar
          chats={chats}
          messages={messages}
          galaxyItems={galaxyItems}
          activeChatId={activeChat?.id ?? ''}
          width={chatSidebarWidth}
          isVisibleMobile={!isChatOpen}
          isSinglePane={isSinglePane}
          archiveMode={archiveMode}
          archivedCount={chats.filter((chat) => chat.archived).length}
          selectedIds={chatSelection.selectedIds}
          selectionActive={chatSelection.active}
          onSelect={selectChat}
          onNewChat={openNewChat}
          onAction={handleAction}
          onToggleSelection={chatSelection.toggle}
          onStartSelection={chatSelection.start}
          onClearSelection={chatSelection.clear}
          onSelectAll={chatSelection.selectAll}
          onArchiveSelected={() => void archiveSelectedChats()}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
          onArchiveModeChange={changeArchiveMode}
        />
      ) : null}

      {!isSinglePane && !chatMaximized ? (
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
              maximized={chatMaximized}
              onBack={handleConversationBack}
              onToggleMaximized={toggleChatMaximized}
              onAction={handleAction}
              canUseResponseActions={
                !activeChat.archived && latestAssistantMessage != null
              }
              responseActionsBusy={sending || activeChat.archived}
              onRegenerateLast={() => requestLatestResponseAction('regenerate')}
              onContinueLast={() => requestLatestResponseAction('continue')}
            />
            <div className="relative flex min-h-0 flex-1">
              {canvasChat ? (
                <div className="flex min-h-0 flex-1">
                  <MessageList
                    chatId={canvasChat.id}
                    messages={canvasMessages}
                    provider={canvasProvider}
                    assistantName={canvasAssistantName}
                    assistantAvatar={galaxyItemAvatar(canvasCharacter)}
                    userName={canvasUserName}
                    userAvatar={
                      galaxyItemAvatar(canvasPersona) ?? profileAvatar
                    }
                    sending={
                      sending &&
                      activeMessageGeneration?.chatId === canvasChat.id
                    }
                    activeMessageGeneration={activeMessageGeneration}
                    viewActive={!isSinglePane || isChatOpen}
                    viewMode={chatViewMode}
                    showAvatars={showMessageAvatars}
                    showTimestamps={showMessageTimestamps}
                    providersAvailable={providers.length > 0}
                    wide={chatMaximized}
                    scrollRef={messageScrollRef}
                    scrollToBottomRequest={scrollToBottomRequest}
                    viewportHeight={keyboardViewportHeight}
                    clearSelectionRequest={clearMessageSelectionRequest}
                    responseActionRequest={responseActionRequest}
                    onGenerationComplete={requestComposerFocusAfterGeneration}
                    onSelectionActiveChange={setMessageSelectionActive}
                    readOnly={canvasChat.archived}
                    onBranch={onBranchMessage}
                    onRewind={onRewindMessage}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onDeleteMany={onDeleteMessages}
                    onRemember={onRememberMessage}
                    onRegenerate={onRegenerateMessage}
                    onContinue={onContinueMessage}
                    onSelectVariant={onSelectMessageVariant}
                  />
                </div>
              ) : null}
            </div>
            {canvasChat ? (
              <div className="shrink-0">
                {canvasChat.archived ? (
                  <div className="border-t border-separator bg-background px-4 py-3 sm:px-6">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-default/45 px-4 py-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
                        <Icon
                          name="archive"
                          className="size-4 shrink-0 text-accent"
                        />
                        {t('chatsScreen.archivedReadOnly')}
                      </span>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={working}
                        onPress={() => handleAction('unarchive', canvasChat)}
                      >
                        <Icon name="unarchive" className="size-4" />
                        {t('chatActions.unarchive')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ChatComposer
                    key={canvasChat.id}
                    chatId={canvasChat.id}
                    provider={canvasProvider}
                    sending={canvasGenerationActive}
                    generationBlocked={generationBusyElsewhere}
                    sendOnEnter={sendOnEnter}
                    focusAfterSend={focusComposerAfterSend}
                    focusAfterActionRequest={focusComposerRequest}
                    saveDrafts={saveDrafts}
                    shouldAutoFocus={shouldAutoFocusComposer}
                    focusKey={`${canvasChat.id}:${isChatOpen}`}
                    wide={chatMaximized}
                    onSend={send}
                    onCancel={cancelGeneration}
                    onHeightChange={keepBottomPinnedAfterComposerResize}
                  />
                )}
              </div>
            ) : null}
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
        chats={chats}
        galaxyItems={galaxyItems}
        aiModules={aiModules}
        providers={providers}
        profileName={displayProfileName}
        responseLanguage={responseLanguage}
        messages={configMessages}
        saving={working}
        initialCharacterId={
          configTarget === 'new' ? newChatCharacterId : undefined
        }
        onOpenChange={(open) => {
          if (open) return;
          setConfigTarget(null);
          setNewChatCharacterId(undefined);
        }}
        onSubmit={(input) => void saveConfig(input)}
      />

      <UiModal
        isOpen={bulkDeleteOpen}
        onOpenChange={(open) => !open && !working && setBulkDeleteOpen(false)}
        onConfirm={() => void deleteSelectedChats()}
        isConfirmDisabled={chatSelection.selectedIds.size === 0 || working}
        title={t('selection.deleteSelectedChats', {
          count: chatSelection.selectedIds.size,
        })}
        description={t('selection.deleteSelectedChatsDescription')}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setBulkDeleteOpen(false)}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={() => void deleteSelectedChats()}
            >
              {t('chatDialogs.delete')}
            </Button>
          </>
        }
      >
        <div className="max-h-[min(50dvh,24rem)] space-y-2 overflow-y-auto overscroll-contain">
          {chats
            .filter((chat) => chatSelection.selectedIds.has(chat.id))
            .map((chat) => (
              <div
                key={chat.id}
                className="rounded-xl bg-default/45 px-3 py-2 text-sm"
              >
                {chat.title}
              </div>
            ))}
        </div>
      </UiModal>

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
