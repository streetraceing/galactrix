import { Button, Chip, Spinner, Surface } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import './App.css';
import { BrandMark } from './components/BrandMark';
import { Icon } from './components/Icon';
import { ResizeHandle } from './components/ResizeHandle';
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
} from './lib/backend';
import { ChatsScreen } from './screens/ChatsScreen';
import { GalaxiesScreen } from './screens/GalaxiesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TelescopeScreen } from './screens/TelescopeScreen';
import type {
  AppSettings,
  AppSnapshot,
  GalaxyItemInput,
  ProviderInput,
  TabId,
} from './types';

const tabs: Array<{
  id: TabId;
  label: string;
  icon: 'chats' | 'galaxies' | 'telescope' | 'profile';
}> = [
  { id: 'chats', label: 'Чаты', icon: 'chats' },
  { id: 'galaxies', label: 'Галактики', icon: 'galaxies' },
  { id: 'telescope', label: 'Телескоп', icon: 'telescope' },
  { id: 'profile', label: 'Профиль', icon: 'profile' },
];

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

function App() {
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
    if (snapshot.settings.haptics && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
  }, [snapshot.settings.haptics]);

  const navigate = (tab: TabId) => {
    haptic();
    setActiveTab(tab);
  };

  const activeLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? '',
    [activeTab],
  );

  const handleNewChat = async () => {
    try {
      const created = await createChat('Новый чат');
      await refresh();
      setActiveChatId(created.id);
      setActiveTab('chats');
      haptic();
    } catch (error) {
      setNotice(errorText(error));
    }
  };

  const handleRenameChat = async (chatId: string, title: string) => {
    await renameChat(chatId, title);
    await refresh();
    haptic();
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    await refresh();
    haptic();
  };

  const handlePinChat = async (chatId: string, pinned: boolean) => {
    await setChatPinned(chatId, pinned);
    await refresh();
    haptic();
  };

  const handleClearChat = async (chatId: string) => {
    await clearChat(chatId);
    await refresh();
    haptic();
  };

  const handleSend = async (content: string, providerId: string) => {
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
  };

  const handleChatProvider = async (chatId: string, providerId?: string) => {
    try {
      await setChatProvider(chatId, providerId);
      await refresh();
    } catch (error) {
      setNotice(errorText(error));
    }
  };

  const handleSaveGalaxy = async (input: GalaxyItemInput) => {
    await upsertGalaxyItem(input);
    await refresh();
    haptic();
  };

  const handleDeleteGalaxy = async (id: string) => {
    await deleteGalaxyItem(id);
    await refresh();
    haptic();
  };

  const handleSaveProvider = async (
    provider: ProviderInput,
    apiKey?: string,
  ) => {
    const saved = await saveProvider(provider, apiKey);
    await refresh();
    haptic();
    return saved;
  };

  const handleCheckProvider = async (id: string) => {
    const checked = await checkProvider(id);
    await refresh();
    return checked;
  };

  const handleDeleteProvider = async (id: string) => {
    await deleteProvider(id);
    await refresh();
    haptic();
  };

  const previewSettings = useCallback((settings: AppSettings) => {
    setSnapshot((current) => ({ ...current, settings }));
  }, []);

  const handleSettings = async (settings: AppSettings) => {
    const previous = snapshot.settings;
    previewSettings(settings);
    try {
      const saved = await updateSettings(settings);
      previewSettings(saved);
    } catch (error) {
      previewSettings(previous);
      setNotice(errorText(error));
    }
  };

  if (fatalError) {
    return (
      <main className="app-shell grid h-full place-items-center p-6">
        <Surface
          className="w-full max-w-md p-7 text-center"
          variant="secondary"
        >
          <div className="mx-auto mb-5 flex justify-center">
            <BrandMark size={58} />
          </div>
          <h1 className="text-xl font-semibold">Не удалось открыть данные</h1>
          <p className="allow-selection mt-2 wrap-break-word text-sm leading-6 app-muted">
            {fatalError}
          </p>
          <Button
            className="mt-6"
            variant="primary"
            onPress={() => void boot()}
          >
            Повторить
          </Button>
        </Surface>
      </main>
    );
  }

  return (
    <main className="app-shell flex h-full min-w-0 overflow-hidden">
      <aside
        className="app-primary-sidebar"
        style={
          {
            '--app-sidebar-width': `${snapshot.settings.sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <div className="app-brand-area">
          <BrandMark size={40} />
          <div className="app-brand-copy">
            <div className="app-brand-title">Galactrix</div>
            <div className="app-brand-subtitle">AI-клиент</div>
          </div>
        </div>

        <nav className="app-sidebar-nav" aria-label="Основная навигация">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="lg"
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              className="app-primary-nav-item w-full justify-start gap-3 px-3"
              onPress={() => navigate(tab.id)}
            >
              <Icon name={tab.icon} className="size-[1.15rem] shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {tab.label}
              </span>
              {tab.id === 'chats' && snapshot.chats.length > 0 && (
                <Chip size="sm" variant="soft">
                  {snapshot.chats.length}
                </Chip>
              )}
            </Button>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <span>Galactrix</span>
          <span>{snapshot.appVersion ? `v${snapshot.appVersion}` : ''}</span>
        </div>
      </aside>

      <ResizeHandle
        value={snapshot.settings.sidebarWidth}
        min={196}
        max={420}
        label="Изменить ширину основной панели"
        onChange={(sidebarWidth) =>
          previewSettings({ ...snapshot.settings, sidebarWidth })
        }
        onCommit={(sidebarWidth) =>
          void handleSettings({ ...snapshot.settings, sidebarWidth })
        }
      />

      <section className="app-main-stage">
        <header className="app-mobile-topbar">
          <BrandMark size={31} />
          <strong className="min-w-0 flex-1 truncate text-sm">
            {activeLabel}
          </strong>
          {activeTab === 'chats' ? (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Новый чат"
              onPress={() => void handleNewChat()}
            >
              <Icon name="plus" className="size-5" />
            </Button>
          ) : (
            <span className="size-8" aria-hidden="true" />
          )}
        </header>

        {loading && (
          <div className="app-loading-overlay absolute inset-0 z-40 grid place-items-center backdrop-blur-sm">
            <Spinner aria-label="Загрузка" />
          </div>
        )}

        {notice && (
          <Surface
            variant="tertiary"
            role="status"
            className="absolute right-3 top-3 z-50 flex max-w-[min(28rem,calc(100%-1.5rem))] items-start gap-3 p-3 shadow-xl md:top-4"
          >
            <span className="allow-selection min-w-0 flex-1 wrap-break-word text-sm">
              {notice}
            </span>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Закрыть уведомление"
              onPress={() => setNotice('')}
            >
              <Icon name="close" className="size-4" />
            </Button>
          </Surface>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden pb-20 md:pb-0">
          {!loading && activeTab === 'chats' && (
            <ChatsScreen
              chats={snapshot.chats}
              messages={snapshot.messages}
              providers={snapshot.providers}
              activeChatId={activeChatId}
              chatSidebarWidth={snapshot.settings.chatSidebarWidth}
              onChatSidebarWidthPreview={(chatSidebarWidth) =>
                previewSettings({ ...snapshot.settings, chatSidebarWidth })
              }
              onChatSidebarWidthCommit={(chatSidebarWidth) =>
                void handleSettings({ ...snapshot.settings, chatSidebarWidth })
              }
              onSelectChat={setActiveChatId}
              onNewChat={() => void handleNewChat()}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              onSetPinned={handlePinChat}
              onClearChat={handleClearChat}
              onSend={handleSend}
              onSetProvider={handleChatProvider}
              sendOnEnter={snapshot.settings.sendOnEnter}
              saveDrafts={snapshot.settings.saveDrafts}
              sending={sending}
            />
          )}
          {!loading && activeTab === 'galaxies' && (
            <GalaxiesScreen
              items={snapshot.galaxyItems}
              onSave={handleSaveGalaxy}
              onDelete={handleDeleteGalaxy}
            />
          )}
          {!loading && activeTab === 'telescope' && (
            <TelescopeScreen
              providers={snapshot.providers}
              onFetchModels={fetchProviderModels}
              onSave={handleSaveProvider}
              onCheck={handleCheckProvider}
              onDelete={handleDeleteProvider}
            />
          )}
          {!loading && activeTab === 'profile' && (
            <ProfileScreen
              usage={snapshot.usage}
              settings={snapshot.settings}
              chatCount={snapshot.chats.length}
              messageCount={snapshot.messages.length}
              providerCount={snapshot.providers.length}
              appVersion={snapshot.appVersion}
              onChangeSettings={(settings) => void handleSettings(settings)}
            />
          )}
        </div>

        <nav className="app-bottom-nav" aria-label="Мобильная навигация">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              className="app-bottom-nav-item"
              onPress={() => navigate(tab.id)}
            >
              <Icon name={tab.icon} className="size-5" />
              <span className="app-bottom-nav-label">{tab.label}</span>
            </Button>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default App;
