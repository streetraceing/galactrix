import { Icon } from '../components/Icon';
import type { AppSettings, UsagePoint } from '../types';

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${checked ? 'on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function ProfileScreen({
  usage,
  settings,
  chatCount,
  messageCount,
  onChangeSettings,
}: {
  usage: UsagePoint[];
  settings: AppSettings;
  chatCount: number;
  messageCount: number;
  onChangeSettings: (settings: AppSettings) => void;
}) {
  const maxTokens = Math.max(...usage.map((point) => point.tokens), 1);
  const totalTokens = usage.reduce((sum, point) => sum + point.tokens, 0);
  const totalRequests = usage.reduce((sum, point) => sum + point.requests, 0);
  const patch = (key: keyof AppSettings, value: boolean) =>
    onChangeSettings({ ...settings, [key]: value });

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header profile-header">
        <div>
          <span className="eyebrow">Локальный профиль</span>
          <h1>Профиль</h1>
          <p>Статистика использования и настройки приложения.</p>
        </div>
        <div className="profile-card-mini">
          <span>XS</span>
          <div>
            <strong>xstreetraceing</strong>
            <small>Данные только на устройстве</small>
          </div>
        </div>
      </header>

      <div className="metric-grid">
        <article className="metric-card panel">
          <span>Токены за неделю</span>
          <strong>{Math.round(totalTokens / 1000)}K</strong>
          <small>+18% к прошлой неделе</small>
        </article>
        <article className="metric-card panel">
          <span>Запросы</span>
          <strong>{totalRequests}</strong>
          <small>{Math.round(totalRequests / 7)} в среднем за день</small>
        </article>
        <article className="metric-card panel">
          <span>Локальные чаты</span>
          <strong>{chatCount}</strong>
          <small>{messageCount.toLocaleString('ru-RU')} сообщений</small>
        </article>
        <article className="metric-card panel">
          <span>Активное время</span>
          <strong>8.4 ч</strong>
          <small>за последние 7 дней</small>
        </article>
      </div>

      <section className="usage-panel panel">
        <div className="section-title">
          <div>
            <h2>Активность</h2>
            <p>Токены по дням, без отправки аналитики наружу.</p>
          </div>
          <nav className="mini-tabs">
            <button>День</button>
            <button className="active">Неделя</button>
            <button>Месяц</button>
          </nav>
        </div>
        <div className="usage-chart">
          {usage.map((point) => (
            <div className="usage-column" key={point.label}>
              <span className="usage-value">
                {Math.round(point.tokens / 1000)}K
              </span>
              <div className="usage-bar-track">
                <i
                  style={{
                    height: `${Math.max(12, (point.tokens / maxTokens) * 100)}%`,
                  }}
                />
              </div>
              <span>{point.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="settings-layout">
        <section className="settings-panel panel">
          <div className="section-title">
            <div>
              <h2>Интерфейс</h2>
              <p>Настройки применяются отдельно на каждом устройстве.</p>
            </div>
            <Icon name="settings" />
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <span className="setting-icon">
                <Icon name="sparkles" />
              </span>
              <div>
                <strong>Анимации</strong>
                <small>Плавные переходы и эффекты</small>
              </div>
              <Toggle
                checked={settings.animations}
                onChange={(value) => patch('animations', value)}
              />
            </div>
            <div className="setting-row">
              <span className="setting-icon">
                <Icon name="telescope" />
              </span>
              <div>
                <strong>Виброотклик</strong>
                <small>Только на поддерживаемых мобильных устройствах</small>
              </div>
              <Toggle
                checked={settings.haptics}
                onChange={(value) => patch('haptics', value)}
              />
            </div>
            <div className="setting-row">
              <span className="setting-icon">
                <Icon name="chats" />
              </span>
              <div>
                <strong>Компактный режим</strong>
                <small>Меньше отступов и больше контента</small>
              </div>
              <Toggle
                checked={settings.compactMode}
                onChange={(value) => patch('compactMode', value)}
              />
            </div>
          </div>
        </section>

        <section className="settings-panel panel">
          <div className="section-title">
            <div>
              <h2>Чаты и данные</h2>
              <p>Поведение редактора и локального хранилища.</p>
            </div>
            <Icon name="database" />
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <span className="setting-icon">
                <Icon name="send" />
              </span>
              <div>
                <strong>Enter отправляет</strong>
                <small>Shift+Enter создаёт новую строку</small>
              </div>
              <Toggle
                checked={settings.sendOnEnter}
                onChange={(value) => patch('sendOnEnter', value)}
              />
            </div>
            <div className="setting-row">
              <span className="setting-icon">
                <Icon name="book" />
              </span>
              <div>
                <strong>Сохранять черновики</strong>
                <small>Восстанавливать текст после закрытия</small>
              </div>
              <Toggle
                checked={settings.saveDrafts}
                onChange={(value) => patch('saveDrafts', value)}
              />
            </div>
            <button className="setting-link">
              <span className="setting-icon">
                <Icon name="database" />
              </span>
              <div>
                <strong>Экспорт локальных данных</strong>
                <small>Чаты, галактики и настройки без API-ключей</small>
              </div>
              <Icon name="chevron" />
            </button>
          </div>
        </section>
      </div>

      <section className="about-row panel">
        <div className="brand-mark small">G</div>
        <div>
          <strong>Galactrix</strong>
          <small>Прототип архитектуры · Tauri + React + Rust</small>
        </div>
        <span>v0.1.0</span>
      </section>
    </div>
  );
}
