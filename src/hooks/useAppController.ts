import { useCallback, useEffect, useState } from 'react';
import {
  checkProvider,
  clearChat,
  createChat,
  deleteChat,
  deleteGalaxyItem,
  deleteProvider,
  fetchProviderModels,
  loadSnapshot,
  renameChat,
  saveProvider,
  sendChatMessage,
  setChatPinned,
  setChatProvider,
  updateSettings,
  upsertGalaxyItem,
} from '../lib/backend';
import type {
  AppSettings,
  AppSnapshot,
  GalaxyItemInput,
  ProviderInput,
  TabId,
} from '../types';

const defaultSettings: AppSettings = {
  animations: true,
  haptics: true,
  compactMode: false,
  sendOnEnter: true,
  saveDrafts: true,
  interfaceScale: 1,
  sidebarWidth: 248,
  chatSidebarWidth: 320,
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
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [activeChatId, setActiveChatId] = useState('');
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
    const scale = Math.min(
      1.5,
      Math.max(0.8, snapshot.settings.interfaceScale),
    );
    document.documentElement.style.fontSize = `${16 * scale}px`;
    document.documentElement.dataset.animations = snapshot.settings.animations
      ? 'on'
      : 'off';
  }, [snapshot.settings.animations, snapshot.settings.interfaceScale]);

  const haptic = useCallback(() => {
    if (snapshot.settings.haptics && 'vibrate' in navigator)
      navigator.vibrate(12);
  }, [snapshot.settings.haptics]);

  const navigate = useCallback(
    (tab: TabId) => {
      haptic();
      setActiveTab(tab);
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
      } catch (error) {
        previewSettings(previous);
        setNotice(errorText(error));
      }
    },
    [previewSettings, snapshot.settings],
  );

  const createNewChat = useCallback(async () => {
    try {
      const created = await createChat('Новый чат');
      await refresh();
      setActiveChatId(created.id);
      setActiveTab('chats');
      haptic();
    } catch (error) {
      setNotice(errorText(error));
    }
  }, [haptic, refresh]);

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
      await deleteChat(chatId);
      await refresh();
      haptic();
    },
    [haptic, refresh],
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
    async (content: string, providerId: string) => {
      if (!activeChatId || sending) return;
      setSending(true);
      try {
        await sendChatMessage(activeChatId, providerId, content);
        await refresh();
        haptic();
      } catch (error) {
        await refresh().catch(() => undefined);
        setNotice(errorText(error));
        throw error;
      } finally {
        setSending(false);
      }
    },
    [activeChatId, haptic, refresh, sending],
  );

  const changeChatProvider = useCallback(
    async (chatId: string, providerId?: string) => {
      try {
        await setChatProvider(chatId, providerId);
        await refresh();
      } catch (error) {
        setNotice(errorText(error));
      }
    },
    [refresh],
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

  const saveProviderConnection = useCallback(
    async (provider: ProviderInput, apiKey?: string) => {
      const saved = await saveProvider(provider, apiKey);
      await refresh();
      haptic();
      return saved;
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
    loading,
    fatalError,
    notice,
    sending,
    navigate,
    boot,
    setNotice,
    setActiveChatId,
    previewSettings,
    saveSettings,
    createNewChat,
    renameExistingChat,
    removeChat,
    pinChat,
    clearExistingChat,
    sendMessage,
    changeChatProvider,
    saveGalaxyItem,
    removeGalaxyItem,
    fetchProviderModels,
    saveProviderConnection,
    checkProviderConnection,
    removeProviderConnection,
  };
}
