import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  branchChat,
  cancelGeneration,
  checkProvider,
  clearChat,
  cloneChat,
  createChat,
  deleteChat,
  deleteGalaxyItem,
  deleteMessage,
  deleteProvider,
  editMessage,
  exportProviderSecrets,
  fetchProviderModels,
  importProviderConnections,
  importGalaxyItems,
  isBackendCommandError,
  loadChatState,
  loadSnapshot,
  regenerateMessage,
  renameChat,
  saveProvider,
  selectMessageVariant,
  sendChatMessage,
  setMessageRemembered,
  setChatPinned,
  updateChatConfig,
  updateSettings,
  upsertGalaxyItem,
} from '../lib/backend';
import type {
  AppSettings,
  AppSnapshot,
  ChatConfigInput,
  GalaxyItemInput,
  ProviderInput,
  ProviderImportInput,
  TabId,
} from '../types';
import { useMobileBackEntry } from './useMobileBackEntry';
import {
  getLanguagePreference,
  getLocale,
  i18next,
  setLanguagePreference,
} from '../i18n';

const defaultSettings: AppSettings = {
  profileName: '',
  profileAvatar: undefined,
  animations: true,
  haptics: true,
  compactMode: false,
  sendOnEnter: true,
  saveDrafts: true,
  chatViewMode: 'conversation',
  showMessageAvatars: true,
  showMessageTimestamps: true,
  responseLanguage: 'app',
  interfaceScale: 1,
  sidebarWidth: 248,
  chatSidebarWidth: 320,
  sidebarCollapsed: false,
  themeMode: 'system',
  themeVariant: 'default',
  language: getLanguagePreference(),
};

const emptySnapshot: AppSnapshot = {
  chats: [],
  messages: [],
  galaxyItems: [],
  providers: [],
  settings: defaultSettings,
  usage: [],
  appVersion: '',
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sortChats(chats: AppSnapshot['chats']) {
  return [...chats].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      right.updatedAt - left.updatedAt,
  );
}

function createGenerationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `generation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAppController() {
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [activeChatId, setActiveChatId] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const activeGenerationRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);

  const refresh = useCallback(async () => {
    const data = await loadSnapshot();
    setSnapshot(data);
    setActiveChatId((current) =>
      data.chats.some((chat) => chat.id === current)
        ? current
        : (data.chats[0]?.id ?? ''),
    );
    return data;
  }, []);

  const refreshChat = useCallback(async (chatId: string) => {
    const state = await loadChatState(chatId);
    setSnapshot((current) => ({
      ...current,
      chats: sortChats([
        ...current.chats.filter((chat) => chat.id !== chatId),
        state.chat,
      ]),
      messages: [
        ...current.messages.filter((message) => message.chatId !== chatId),
        ...state.messages,
      ],
    }));
    return state;
  }, []);

  const boot = useCallback(async () => {
    setLoading(true);
    setFatalError('');
    try {
      await refresh();
    } catch (error) {
      setFatalError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setTheme(snapshot.settings.themeMode);
    document.documentElement.dataset.themeVariant =
      snapshot.settings.themeVariant;
    localStorage.setItem(
      'galactrix-theme-variant',
      snapshot.settings.themeVariant,
    );
  }, [setTheme, snapshot.settings.themeMode, snapshot.settings.themeVariant]);

  useEffect(() => {
    setLanguagePreference(snapshot.settings.language);
  }, [snapshot.settings.language]);

  useEffect(() => {
    const scale = Math.min(
      1.5,
      Math.max(0.8, snapshot.settings.interfaceScale),
    );
    document.documentElement.style.fontSize = `${16 * scale}px`;
    document.documentElement.dataset.animations = snapshot.settings.animations
      ? 'on'
      : 'off';
    document.documentElement.dataset.compact = snapshot.settings.compactMode
      ? 'on'
      : 'off';
  }, [
    snapshot.settings.animations,
    snapshot.settings.compactMode,
    snapshot.settings.interfaceScale,
  ]);

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
      closeChat();
      setActiveTab(tab);
    },
    [closeChat, haptic],
  );

  const openChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId);
      setIsChatOpen(true);
      setActiveTab('chats');
      haptic();
    },
    [haptic],
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
        setNotice(errorText(error));
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
      setActiveTab('chats');
      haptic();
    },
    [haptic, refreshChat],
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
        snapshot.chats.find((chat) => chat.id !== chatId)?.id ?? '';
      if (chatId === activeChatId) closeChat();
      await deleteChat(chatId);
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

  const clearExistingChat = useCallback(
    async (chatId: string) => {
      await clearChat(chatId);
      await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeChatId || sending) return;
      const chatId = activeChatId;
      const generationId = createGenerationId();
      activeGenerationRef.current = generationId;
      cancelRequestedRef.current = false;
      setSending(true);
      try {
        await sendChatMessage(
          chatId,
          content,
          generationId,
          snapshot.settings.responseLanguage === 'app'
            ? getLocale()
            : undefined,
        );
        await refreshChat(chatId);
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
          setSending(false);
        }
      }
    },
    [
      activeChatId,
      haptic,
      refreshChat,
      sending,
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
      const sourceTitle =
        snapshot.chats.find((chat) => chat.id === chatId)?.title ||
        i18next.t('setup.defaultTitle', { ns: 'chats' });
      const title =
        input?.title.trim() ||
        i18next.t('chatsScreen.copyTitle', {
          ns: 'chats',
          value1: sourceTitle,
        });
      const created = await cloneChat(chatId, title, includeMessages, input);
      await refreshChat(created.id);
      setActiveChatId(created.id);
      setIsChatOpen(true);
      setActiveTab('chats');
      haptic();
    },
    [haptic, refreshChat, snapshot.chats],
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
      setActiveTab('chats');
      haptic();
    },
    [haptic, refreshChat, snapshot.chats, snapshot.messages],
  );

  const editExistingMessage = useCallback(
    async (messageId: string, content: string) => {
      const chatId = snapshot.messages.find(
        (message) => message.id === messageId,
      )?.chatId;
      await editMessage(messageId, content);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const removeMessage = useCallback(
    async (messageId: string) => {
      const chatId = snapshot.messages.find(
        (message) => message.id === messageId,
      )?.chatId;
      await deleteMessage(messageId);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const rememberMessage = useCallback(
    async (messageId: string, remembered: boolean) => {
      const chatId = snapshot.messages.find(
        (message) => message.id === messageId,
      )?.chatId;
      await setMessageRemembered(messageId, remembered);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
  );

  const regenerateExistingMessage = useCallback(
    async (messageId: string) => {
      if (sending) return;
      const chatId = snapshot.messages.find(
        (message) => message.id === messageId,
      )?.chatId;
      const generationId = createGenerationId();
      activeGenerationRef.current = generationId;
      cancelRequestedRef.current = false;
      setSending(true);
      try {
        await regenerateMessage(
          messageId,
          generationId,
          snapshot.settings.responseLanguage === 'app'
            ? getLocale()
            : undefined,
        );
        if (chatId) await refreshChat(chatId);
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
          setSending(false);
        }
      }
    },
    [
      haptic,
      refreshChat,
      sending,
      snapshot.messages,
      snapshot.settings.responseLanguage,
    ],
  );

  const chooseMessageVariant = useCallback(
    async (messageId: string, variantIndex: number) => {
      const chatId = snapshot.messages.find(
        (message) => message.id === messageId,
      )?.chatId;
      await selectMessageVariant(messageId, variantIndex);
      if (chatId) await refreshChat(chatId);
      haptic();
    },
    [haptic, refreshChat, snapshot.messages],
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
    loading,
    fatalError,
    notice,
    sending,
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
    clearExistingChat,
    sendMessage,
    cancelCurrentGeneration,
    cloneExistingChat,
    branchFromMessage,
    editExistingMessage,
    removeMessage,
    rememberMessage,
    regenerateExistingMessage,
    chooseMessageVariant,
    saveGalaxyItem,
    importGalaxyLibrary,
    removeGalaxyItem,
    fetchProviderModels,
    exportProviderSecrets,
    importProviders,
    saveProviderConnection,
    checkProviderConnection,
    removeProviderConnection,
  };
}
