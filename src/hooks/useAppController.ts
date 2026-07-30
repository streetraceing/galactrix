import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import {
  branchChat,
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
      await refresh();
      setActiveChatId(created.id);
      setIsChatOpen(true);
      setActiveTab('chats');
      haptic();
    },
    [haptic, refresh],
  );

  const updateExistingChat = useCallback(
    async (chatId: string, input: ChatConfigInput) => {
      await updateChatConfig(chatId, input);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const renameExistingChat = useCallback(
    async (chatId: string, title: string) => {
      await renameChat(chatId, title);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (chatId === activeChatId) closeChat();
      await deleteChat(chatId);
      await refresh();
      haptic();
    },
    [activeChatId, closeChat, haptic, refresh],
  );

  const pinChat = useCallback(
    async (chatId: string, pinned: boolean) => {
      await setChatPinned(chatId, pinned);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const clearExistingChat = useCallback(
    async (chatId: string) => {
      await clearChat(chatId);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeChatId || sending) return;
      setSending(true);
      try {
        await sendChatMessage(
          activeChatId,
          content,
          snapshot.settings.responseLanguage === 'app'
            ? getLocale()
            : undefined,
        );
        await refresh();
        haptic();
      } catch (error) {
        await refresh().catch(() => undefined);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [
      activeChatId,
      haptic,
      refresh,
      sending,
      snapshot.settings.responseLanguage,
    ],
  );

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
      await refresh();
      setActiveChatId(created.id);
      setIsChatOpen(true);
      setActiveTab('chats');
      haptic();
    },
    [haptic, refresh, snapshot.chats],
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
      await refresh();
      setActiveChatId(created.id);
      setIsChatOpen(true);
      setActiveTab('chats');
      haptic();
    },
    [haptic, refresh, snapshot.chats, snapshot.messages],
  );

  const editExistingMessage = useCallback(
    async (messageId: string, content: string) => {
      await editMessage(messageId, content);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const removeMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const rememberMessage = useCallback(
    async (messageId: string, remembered: boolean) => {
      await setMessageRemembered(messageId, remembered);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const regenerateExistingMessage = useCallback(
    async (messageId: string) => {
      await regenerateMessage(
        messageId,
        snapshot.settings.responseLanguage === 'app' ? getLocale() : undefined,
      );
      await refresh();
      haptic();
    },
    [haptic, refresh, snapshot.settings.responseLanguage],
  );

  const chooseMessageVariant = useCallback(
    async (messageId: string, variantIndex: number) => {
      await selectMessageVariant(messageId, variantIndex);
      await refresh();
      haptic();
    },
    [haptic, refresh],
  );

  const saveGalaxyItem = useCallback(
    async (input: GalaxyItemInput) => {
      await upsertGalaxyItem(input);
      await refresh();
      haptic();
    },
    [haptic, refresh],
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
      await refresh();
      haptic();
      return saved;
    },
    [haptic, refresh],
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

  const checkProviderConnection = useCallback(
    async (id: string) => {
      const checked = await checkProvider(id);
      await refresh();
      return checked;
    },
    [refresh],
  );

  const removeProviderConnection = useCallback(
    async (id: string) => {
      await deleteProvider(id);
      await refresh();
      haptic();
    },
    [haptic, refresh],
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
