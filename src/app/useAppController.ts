import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  branchChat,
  cancelGeneration,
  checkProvider,
  clearChat,
  cloneChat,
  continueMessage,
  createChat,
  deleteChat,
  deleteGalaxyItem,
  deleteMessage,
  deleteMessages,
  deleteProvider,
  editMessage,
  exportProviderSecrets,
  fetchProviderModels,
  importProviderConnections,
  importGalaxyItems,
  isBackendCommandError,
  loadChatState,
  loadSnapshot,
  loadUsageHistory,
  regenerateMessage,
  renameChat,
  rewindChatToMessage,
  saveProvider,
  selectMessageVariant,
  sendChatMessage,
  setMessageRemembered,
  setChatArchived,
  setChatPinned,
  testProviderEmbeddings,
  updateChatConfig,
  updateSettings,
  upsertGalaxyItem,
} from '../lib/backend';
import type {
  AppSettings,
  ChatConfigInput,
  GalaxyItemInput,
  EmbeddingProbeResult,
  ProviderInput,
  ProviderImportInput,
  TabId,
} from '../types';
import { useMobileBackEntry } from '../hooks/useMobileBackEntry';
import { useMobileTabHistory } from '../hooks/useMobileTabHistory';
import { getResponseLocale, i18next } from '../i18n';
import {
  forgetChatNavigationState,
  readChatNavigationState,
  saveChatNavigationState,
} from '../app/chatNavigationState';
import { createEmptySnapshot } from '../app/appState';
import { useApplicationPreferences } from '../app/useApplicationPreferences';
import { errorMessage } from '../lib/errors';
import { createRuntimeId } from '../lib/id';
import {
  findMessageChatId,
  reconcileChatMessages,
  selectMessageVariantInSnapshot,
  sortChats,
} from '../features/chats/chatState';
import { chatConfigFromChat } from '../features/chats/chatConfig';
import type { ActiveMessageGeneration } from '../features/chats/types';

type MessageGenerationCommand = (
  messageId: string,
  generationId: string,
  responseLanguage?: 'en' | 'ru',
) => Promise<void>;

export function useAppController() {
  const initialChatViewRef = useRef(readChatNavigationState());
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [snapshot, setSnapshot] = useState(createEmptySnapshot);
  const [activeChatId, setActiveChatId] = useState(
    initialChatViewRef.current.activeChatId,
  );
  const [isChatOpen, setIsChatOpen] = useState(
    initialChatViewRef.current.isChatOpen,
  );
  const [chatListRequest, setChatListRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [activeMessageGeneration, setActiveMessageGeneration] =
    useState<ActiveMessageGeneration | null>(null);
  const activeGenerationRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);
  const chatRefreshVersionsRef = useRef(new Map<string, number>());

  useApplicationPreferences(snapshot.settings);

  const rememberTabNavigation = useMobileTabHistory(activeTab, setActiveTab);

  const refresh = useCallback(async () => {
    const data = await loadSnapshot();
    setSnapshot(data);
    setActiveChatId((current) =>
      data.chats.some((chat) => chat.id === current)
        ? current
        : (data.chats[0]?.id ?? ''),
    );
    if (data.chats.length === 0) setIsChatOpen(false);
    return data;
  }, []);

  const refreshChat = useCallback(async (chatId: string) => {
    const version = (chatRefreshVersionsRef.current.get(chatId) ?? 0) + 1;
    chatRefreshVersionsRef.current.set(chatId, version);
    const state = await loadChatState(chatId);
    if (state.chat.id !== chatId) {
      throw new Error(
        `Chat state mismatch: expected ${chatId}, got ${state.chat.id}`,
      );
    }
    const chatMessages = state.messages.filter(
      (message) => message.chatId === chatId,
    );
    if (chatRefreshVersionsRef.current.get(chatId) !== version) {
      return { ...state, messages: chatMessages };
    }
    setSnapshot((current) => ({
      ...current,
      chats: sortChats([
        ...current.chats.filter((chat) => chat.id !== chatId),
        state.chat,
      ]),
      messages: reconcileChatMessages(current.messages, chatId, chatMessages),
    }));
    return { ...state, messages: chatMessages };
  }, []);

  const refreshUsage = useCallback(async () => {
    const usage = await loadUsageHistory();
    setSnapshot((current) => ({ ...current, usage }));
    return usage;
  }, []);

  const boot = useCallback(async () => {
    setLoading(true);
    setFatalError('');
    try {
      await refresh();
    } catch (error) {
      setFatalError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (loading || activeTab !== 'profile') return;
    void refreshUsage().catch(() => undefined);
  }, [activeTab, loading, refreshUsage]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (loading) return;
    saveChatNavigationState(activeChatId, isChatOpen);
  }, [activeChatId, isChatOpen, loading]);

  const haptic = useCallback(() => {
    if (snapshot.settings.haptics && 'vibrate' in navigator)
      navigator.vibrate(12);
  }, [snapshot.settings.haptics]);

  const closeChat = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsChatOpen(false);
  }, []);

  useMobileBackEntry(isChatOpen, closeChat);

  const navigate = useCallback(
    (tab: TabId) => {
      haptic();
      rememberTabNavigation(tab);
      if (tab === 'chats') {
        setIsChatOpen(false);
        setChatListRequest((current) => current + 1);
      }
      setActiveTab(tab);
    },
    [haptic, rememberTabNavigation],
  );

  const openChat = useCallback(
    (chatId: string) => {
      rememberTabNavigation('chats');
      startTransition(() => {
        setActiveChatId(chatId);
        setIsChatOpen(true);
        setActiveTab('chats');
      });
      haptic();
    },
    [haptic, rememberTabNavigation],
  );

  const previewSettings = useCallback((settings: AppSettings) => {
    setSnapshot((current) => ({ ...current, settings }));
  }, []);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      const previous = snapshot.settings;
      previewSettings(settings);
      try {
        const saved = await updateSettings(settings);
        previewSettings(saved);
        return true;
      } catch (error) {
        previewSettings(previous);
        setNotice(errorMessage(error));
        return false;
      }
    },
    [previewSettings, snapshot.settings],
  );

  const createNewChat = useCallback(
    async (input: ChatConfigInput) => {
      const created = await createChat(input);
      await refreshChat(created.id);
      setActiveChatId(created.id);
      setIsChatOpen(true);
      rememberTabNavigation('chats');
      setActiveTab('chats');
      haptic();
    },
    [haptic, refreshChat, rememberTabNavigation],
  );

  const updateExistingChat = useCallback(
    async (chatId: string, input: ChatConfigInput) => {
      await updateChatConfig(chatId, input);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const renameExistingChat = useCallback(
    async (chatId: string, title: string) => {
      await renameChat(chatId, title);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      const nextChatId =
        snapshot.chats.find((chat) => chat.id !== chatId && !chat.archived)
          ?.id ?? '';
      if (chatId === activeChatId) closeChat();
      await deleteChat(chatId);
      chatRefreshVersionsRef.current.set(
        chatId,
        (chatRefreshVersionsRef.current.get(chatId) ?? 0) + 1,
      );
      forgetChatNavigationState(chatId);
      setSnapshot((current) => ({
        ...current,
        chats: current.chats.filter((chat) => chat.id !== chatId),
        messages: current.messages.filter(
          (message) => message.chatId !== chatId,
        ),
      }));
      if (chatId === activeChatId) setActiveChatId(nextChatId);
      haptic();
    },
    [activeChatId, closeChat, haptic, snapshot.chats],
  );

  const pinChat = useCallback(
    async (chatId: string, pinned: boolean) => {
      await setChatPinned(chatId, pinned);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const archiveChat = useCallback(
    async (chatId: string, archived: boolean) => {
      await setChatArchived(chatId, archived);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const clearExistingChat = useCallback(
    async (chatId: string) => {
      await clearChat(chatId);
      forgetChatNavigationState(chatId);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeChatId) return;
      if (activeGenerationRef.current) {
        throw new Error(
          i18next.t('errors.generationInProgress', { ns: 'chats' }),
        );
      }
      const activeChat = snapshot.chats.find(
        (chat) => chat.id === activeChatId,
      );
      if (!activeChat || activeChat.archived) return;
      const chatId = activeChatId;
      const generationId = createRuntimeId();
      const userMessageId = createRuntimeId();
      const assistantMessageId = createRuntimeId();
      const createdAt = Math.floor(Date.now() / 1_000);
      activeGenerationRef.current = generationId;
      cancelRequestedRef.current = false;
      setActiveMessageGeneration({
        chatId,
        messageId: assistantMessageId,
        mode: 'send',
      });
      setSnapshot((current) => ({
        ...current,
        chats: sortChats(
          current.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  preview: content,
                  updatedAt: createdAt,
                  messageCount: chat.messageCount + 2,
                }
              : chat,
          ),
        ),
        messages: [
          ...current.messages,
          {
            id: userMessageId,
            chatId,
            role: 'user',
            content,
            createdAt,
            remembered: false,
            activeVariantIndex: 0,
            variants: [],
          },
          {
            id: assistantMessageId,
            chatId,
            role: 'assistant',
            content: '',
            createdAt,
            remembered: false,
            activeVariantIndex: 0,
            variants: [],
            pending: true,
          },
        ],
      }));
      setSending(true);
      try {
        await sendChatMessage(
          chatId,
          content,
          generationId,
          userMessageId,
          assistantMessageId,
          getResponseLocale(snapshot.settings.responseLanguage),
        );
        await refreshChat(chatId);
        await refreshUsage().catch(() => undefined);
        haptic();
      } catch (error) {
        await refreshChat(chatId).catch(() => undefined);
        if (
          !isBackendCommandError(error, 'backend.provider.requestCancelled')
        ) {
          throw error;
        }
      } finally {
        if (activeGenerationRef.current === generationId) {
          activeGenerationRef.current = null;
          cancelRequestedRef.current = false;
          setActiveMessageGeneration(null);
          setSending(false);
        }
      }
    },
    [
      activeChatId,
      haptic,
      refreshChat,
      refreshUsage,
      snapshot.chats,
      snapshot.settings.responseLanguage,
    ],
  );

  const cancelCurrentGeneration = useCallback(async () => {
    const generationId = activeGenerationRef.current;
    if (!generationId || cancelRequestedRef.current) return;
    cancelRequestedRef.current = true;
    try {
      await cancelGeneration(generationId);
    } catch (error) {
      cancelRequestedRef.current = false;
      throw error;
    }
  }, []);

  const cloneExistingChat = useCallback(
    async (
      chatId: string,
      includeMessages: boolean,
      input?: ChatConfigInput,
    ) => {
      const sourceChat = snapshot.chats.find((chat) => chat.id === chatId);
      const cloneInput =
        input ??
        (sourceChat
          ? {
              ...chatConfigFromChat(sourceChat),
              title: '',
              autoTitle: true,
              automaticTitleBase: i18next.t('setup.automaticTitleBase', {
                ns: 'chats',
              }),
            }
          : undefined);
      const title = cloneInput?.title.trim() ?? '';
      const created = await cloneChat(
        chatId,
        title,
        includeMessages,
        cloneInput,
      );
      await refreshChat(created.id);
      setActiveChatId(created.id);
      setIsChatOpen(true);
      rememberTabNavigation('chats');
      setActiveTab('chats');
      haptic();
    },
    [haptic, refreshChat, rememberTabNavigation, snapshot.chats],
  );

  const branchFromMessage = useCallback(
    async (messageId: string) => {
      const sourceMessage = snapshot.messages.find(
        (message) => message.id === messageId,
      );
      const sourceTitle =
        snapshot.chats.find((chat) => chat.id === sourceMessage?.chatId)
          ?.title || i18next.t('setup.defaultTitle', { ns: 'chats' });
      const title = i18next.t('messageList.branchTitle', {
        ns: 'chats',
        value1: sourceTitle,
      });
      const created = await branchChat(messageId, title);
      await refreshChat(created.id);
      setActiveChatId(created.id);
      setIsChatOpen(true);
      rememberTabNavigation('chats');
      setActiveTab('chats');
      haptic();
    },
    [
      haptic,
      refreshChat,
      rememberTabNavigation,
      snapshot.chats,
      snapshot.messages,
    ],
  );

  const editExistingMessage = useCallback(
    async (messageId: string, content: string) => {
      const chatId = findMessageChatId(snapshot.messages, messageId);
      await editMessage(messageId, content);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const removeMessage = useCallback(
    async (messageId: string) => {
      const chatId = findMessageChatId(snapshot.messages, messageId);
      await deleteMessage(messageId);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const removeMessages = useCallback(
    async (messageIds: string[]) => {
      const selectedIds = new Set(messageIds);
      const chatIds = new Set(
        snapshot.messages
          .filter((message) => selectedIds.has(message.id))
          .map((message) => message.chatId),
      );
      await deleteMessages(messageIds);
      await Promise.all([...chatIds].map((chatId) => refreshChat(chatId)));
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const rewindToMessage = useCallback(
    async (messageId: string) => {
      const chatId = findMessageChatId(snapshot.messages, messageId);
      await rewindChatToMessage(messageId);
      if (chatId) {
        forgetChatNavigationState(chatId);
        await refreshChat(chatId);
      }
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const rememberMessage = useCallback(
    async (messageId: string, remembered: boolean) => {
      const chatId = findMessageChatId(snapshot.messages, messageId);
      await setMessageRemembered(messageId, remembered);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const runExistingMessageGeneration = useCallback(
    async (
      messageId: string,
      mode: ActiveMessageGeneration['mode'],
      command: MessageGenerationCommand,
    ) => {
      if (activeGenerationRef.current) {
        throw new Error(
          i18next.t('errors.generationInProgress', { ns: 'chats' }),
        );
      }
      const chatId = findMessageChatId(snapshot.messages, messageId);
      if (!chatId) return;
      const generationId = createRuntimeId();
      activeGenerationRef.current = generationId;
      cancelRequestedRef.current = false;
      setActiveMessageGeneration({ chatId, messageId, mode });
      setSending(true);
      try {
        await command(
          messageId,
          generationId,
          getResponseLocale(snapshot.settings.responseLanguage),
        );
        if (chatId) await refreshChat(chatId);
        await refreshUsage().catch(() => undefined);
        haptic();
      } catch (error) {
        if (chatId) await refreshChat(chatId).catch(() => undefined);
        if (
          !isBackendCommandError(error, 'backend.provider.requestCancelled')
        ) {
          throw error;
        }
      } finally {
        if (activeGenerationRef.current === generationId) {
          activeGenerationRef.current = null;
          cancelRequestedRef.current = false;
          setActiveMessageGeneration(null);
          setSending(false);
        }
      }
    },
    [
      haptic,
      refreshChat,
      refreshUsage,
      snapshot.messages,
      snapshot.settings.responseLanguage,
    ],
  );

  const regenerateExistingMessage = useCallback(
    (messageId: string) =>
      runExistingMessageGeneration(messageId, 'regenerate', regenerateMessage),
    [runExistingMessageGeneration],
  );

  const continueExistingMessage = useCallback(
    (messageId: string) =>
      runExistingMessageGeneration(messageId, 'continue', continueMessage),
    [runExistingMessageGeneration],
  );

  const chooseMessageVariant = useCallback(
    async (messageId: string, variantIndex: number) => {
      await selectMessageVariant(messageId, variantIndex);
      const updatedAt = Math.floor(Date.now() / 1_000);
      setSnapshot((current) =>
        selectMessageVariantInSnapshot(
          current,
          messageId,
          variantIndex,
          updatedAt,
        ),
      );
      haptic();
    },
    [haptic],
  );

  const saveGalaxyItem = useCallback(
    async (input: GalaxyItemInput) => {
      const saved = await upsertGalaxyItem(input);
      setSnapshot((current) => ({
        ...current,
        galaxyItems: [
          saved,
          ...current.galaxyItems.filter((item) => item.id !== saved.id),
        ],
      }));
      haptic();
    },
    [haptic],
  );

  const removeGalaxyItem = useCallback(
    async (id: string) => {
      await deleteGalaxyItem(id);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const importGalaxyLibrary = useCallback(
    async (inputs: GalaxyItemInput[]) => {
      const imported = await importGalaxyItems(inputs);
      await refresh();
      haptic();
      return imported;
    },
    [haptic, refresh],
  );

  const testProviderEmbeddingConnection = useCallback(
    async (
      provider: ProviderInput,
      apiKey?: string,
    ): Promise<EmbeddingProbeResult> =>
      testProviderEmbeddings(provider, apiKey),
    [],
  );

  const saveProviderConnection = useCallback(
    async (provider: ProviderInput, apiKey?: string) => {
      const saved = await saveProvider(provider, apiKey);
      setSnapshot((current) => ({
        ...current,
        providers: [
          saved,
          ...current.providers.filter((item) => item.id !== saved.id),
        ],
      }));
      haptic();
      return saved;
    },
    [haptic],
  );

  const importProviders = useCallback(
    async (entries: ProviderImportInput[]) => {
      const imported = await importProviderConnections(entries);
      await refresh();
      haptic();
      return imported;
    },
    [haptic, refresh],
  );

  const checkProviderConnection = useCallback(async (id: string) => {
    const checked = await checkProvider(id);
    setSnapshot((current) => ({
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === checked.id ? checked : provider,
      ),
    }));
    return checked;
  }, []);

  const removeProviderConnection = useCallback(
    async (id: string) => {
      await deleteProvider(id);
      setSnapshot((current) => ({
        ...current,
        providers: current.providers.filter((provider) => provider.id !== id),
        chats: current.chats.map((chat) =>
          chat.providerId === id ? { ...chat, providerId: undefined } : chat,
        ),
      }));
      haptic();
    },
    [haptic],
  );

  return {
    activeTab,
    snapshot,
    activeChatId,
    isChatOpen,
    chatListRequest,
    loading,
    fatalError,
    notice,
    sending,
    activeMessageGeneration,
    navigate,
    openChat,
    closeChat,
    boot,
    setNotice,
    previewSettings,
    saveSettings,
    createNewChat,
    updateExistingChat,
    renameExistingChat,
    removeChat,
    pinChat,
    archiveChat,
    clearExistingChat,
    sendMessage,
    cancelCurrentGeneration,
    cloneExistingChat,
    branchFromMessage,
    editExistingMessage,
    removeMessage,
    removeMessages,
    rewindToMessage,
    rememberMessage,
    regenerateExistingMessage,
    continueExistingMessage,
    chooseMessageVariant,
    saveGalaxyItem,
    importGalaxyLibrary,
    removeGalaxyItem,
    fetchProviderModels,
    testProviderEmbeddingConnection,
    exportProviderSecrets,
    importProviders,
    saveProviderConnection,
    checkProviderConnection,
    removeProviderConnection,
  };
}
