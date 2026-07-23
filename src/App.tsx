import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Icon } from './components/Icon';
import { ChatsScreen } from './screens/ChatsScreen';
import { GalaxiesScreen } from './screens/GalaxiesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TelescopeScreen } from './screens/TelescopeScreen';
import {
  addMessage,
  createChat,
  loadSnapshot,
  saveGalaxyItem,
  saveProvider,
  updateSettings,
} from './lib/backend';
import type { AppSnapshot, GalaxyItem, Provider, TabId } from './types';
import { mockSnapshot } from './data';

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

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [snapshot, setSnapshot] = useState<AppSnapshot>(mockSnapshot);
  const [activeChatId, setActiveChatId] = useState(
    mockSnapshot.chats[0]?.id ?? '',
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadSnapshot().then((data) => {
      if (!alive) return;
      setSnapshot(data);
      setActiveChatId(data.chats[0]?.id ?? '');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const activeLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? '',
    [activeTab],
  );

  const handleNewChat = async () => {
    const title = `Новый чат ${snapshot.chats.length + 1}`;
    const created = await createChat(title);
    const chat = {
      id: created.id,
      title: created.title,
      preview: 'Пустой локальный диалог',
      updatedAt: 'сейчас',
      messageCount: 0,
      pinned: false,
    };
    setSnapshot((current) => ({ ...current, chats: [chat, ...current.chats] }));
    setActiveChatId(chat.id);
    setActiveTab('chats');
  };

  const handleSend = async (content: string) => {
    if (!activeChatId) return;
    const optimistic = {
      id: crypto.randomUUID(),
      chatId: activeChatId,
      role: 'user' as const,
      content,
      createdAt: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setSnapshot((current) => ({
      ...current,
      messages: [...current.messages, optimistic],
      chats: current.chats.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              preview: content,
              updatedAt: 'сейчас',
              messageCount: chat.messageCount + 1,
            }
          : chat,
      ),
    }));
    await addMessage(activeChatId, 'user', content);
  };

  const handleSaveGalaxy = async (item: GalaxyItem) => {
    await saveGalaxyItem(item);
    setSnapshot((current) => ({
      ...current,
      galaxyItems: [item, ...current.galaxyItems],
    }));
  };

  const handleSaveProvider = async (provider: Provider, apiKey?: string) => {
    await saveProvider(provider, apiKey);
    setSnapshot((current) => ({
      ...current,
      providers: [provider, ...current.providers],
    }));
  };

  const handleSettings = async (settings: AppSnapshot['settings']) => {
    setSnapshot((current) => ({ ...current, settings }));
    await updateSettings(settings);
  };

  return (
    <main
      className={`app-shell ${snapshot.settings.compactMode ? 'compact-mode' : ''} ${snapshot.settings.animations ? 'with-animations' : 'without-animations'}`}
    >
      <aside className="desktop-sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Galactrix</strong>
            <span>local AI client</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="Основная навигация">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              {tab.id === 'chats' && <b>{snapshot.chats.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <section className="sidebar-status">
          <div>
            <i />
            <span>
              <strong>Локальный режим</strong>
              <small>Данные остаются на устройстве</small>
            </span>
          </div>
          <button
            aria-label="Настройки"
            onClick={() => setActiveTab('profile')}
          >
            <Icon name="settings" />
          </button>
        </section>
        <div
          className="sidebar-profile"
          onClick={() => setActiveTab('profile')}
          role="button"
          tabIndex={0}
        >
          <span>XS</span>
          <div>
            <strong>xstreetraceing</strong>
            <small>Профиль устройства</small>
          </div>
          <Icon name="chevron" />
        </div>
      </aside>

      <section className="app-content">
        <header className="mobile-topbar">
          <div className="brand-mark small">G</div>
          <strong>{activeLabel}</strong>
          <button
            className="icon-button"
            onClick={handleNewChat}
            aria-label="Новый чат"
          >
            <Icon name="plus" />
          </button>
        </header>

        {loading && <div className="loading-line" />}
        <div className="screen-host">
          {activeTab === 'chats' && (
            <ChatsScreen
              chats={snapshot.chats}
              messages={snapshot.messages}
              activeChatId={activeChatId}
              onSelectChat={setActiveChatId}
              onNewChat={handleNewChat}
              onSend={handleSend}
              sendOnEnter={snapshot.settings.sendOnEnter}
            />
          )}
          {activeTab === 'galaxies' && (
            <GalaxiesScreen
              items={snapshot.galaxyItems}
              onSave={handleSaveGalaxy}
            />
          )}
          {activeTab === 'telescope' && (
            <TelescopeScreen
              providers={snapshot.providers}
              onSave={handleSaveProvider}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileScreen
              usage={snapshot.usage}
              settings={snapshot.settings}
              chatCount={snapshot.chats.length}
              messageCount={snapshot.messages.length}
              onChangeSettings={handleSettings}
            />
          )}
        </div>

        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              <span>
                <Icon name={tab.icon} />
              </span>
              <small>{tab.label}</small>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default App;
