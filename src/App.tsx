import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { Icon } from './components/Icon';
import { ChatsScreen } from './screens/ChatsScreen';
import { GalaxiesScreen } from './screens/GalaxiesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TelescopeScreen } from './screens/TelescopeScreen';
import {
  checkProvider,
  createChat,
  deleteGalaxyItem,
  deleteProvider,
  fetchProviderModels,
  loadSnapshot,
  saveProvider,
  sendChatMessage,
  setChatProvider,
  updateSettings,
  upsertGalaxyItem,
} from './lib/backend';
import type {
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

const emptySnapshot: AppSnapshot = {
  chats: [],
  messages: [],
  galaxyItems: [],
  providers: [],
  settings: {
    animations: true,
    haptics: true,
    compactMode: false,
    sendOnEnter: true,
    saveDrafts: true,
  },
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

  const handleSettings = async (settings: AppSnapshot['settings']) => {
    const previous = snapshot.settings;
    setSnapshot((current) => ({ ...current, settings }));
    try {
      await updateSettings(settings);
    } catch (error) {
      setSnapshot((current) => ({ ...current, settings: previous }));
      setNotice(errorText(error));
    }
  };

  if (fatalError) {
    return (
      <main className="boot-screen">
        <section>
          <div className="app-symbol">G</div>
          <h1>Не удалось открыть локальные данные</h1>
          <p>{fatalError}</p>
          <button className="primary-button" onClick={() => void boot()}>
            Повторить
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`app-shell ${snapshot.settings.compactMode ? 'compact-mode' : ''} ${snapshot.settings.animations ? 'with-animations' : 'without-animations'}`}
    >
      <aside className="desktop-sidebar">
        <div className="brand">
          <div className="app-symbol">G</div>
          <div>
            <strong>Galactrix</strong>
            <span>Локальный клиент</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => navigate(tab.id)}
              key={tab.id}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              {tab.id === 'chats' && snapshot.chats.length > 0 && (
                <b>{snapshot.chats.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="local-status">
          <span />
          <div>
            <strong>Локальное хранение</strong>
            <small>SQLite и системное хранилище ключей</small>
          </div>
        </div>
      </aside>

      <section className="app-content">
        <header className="mobile-topbar">
          <div className="app-symbol small">G</div>
          <strong>{activeLabel}</strong>
          <button
            className="icon-button"
            onClick={() => void handleNewChat()}
            aria-label="Новый чат"
          >
            <Icon name="plus" />
          </button>
        </header>

        {loading && <div className="loading-line" />}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Закрыть">
              <Icon name="close" />
            </button>
          </div>
        )}

        <div className="screen-host">
          {!loading && activeTab === 'chats' && (
            <ChatsScreen
              chats={snapshot.chats}
              messages={snapshot.messages}
              providers={snapshot.providers}
              activeChatId={activeChatId}
              onSelectChat={setActiveChatId}
              onNewChat={() => void handleNewChat()}
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
              onChangeSettings={handleSettings}
            />
          )}
        </div>

        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => navigate(tab.id)}
              key={tab.id}
            >
              <Icon name={tab.icon} />
              <small>{tab.label}</small>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default App;
