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

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString('ru-RU');
}

export function ProfileScreen({
  usage,
  settings,
  chatCount,
  messageCount,
  providerCount,
  appVersion,
  onChangeSettings,
}: {
  usage: UsagePoint[];
  settings: AppSettings;
  chatCount: number;
  messageCount: number;
  providerCount: number;
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => void;
}) {
  const maxTokens = Math.max(...usage.map((point) => point.tokens), 1);
  const totalTokens = usage.reduce((sum, point) => sum + point.tokens, 0);
  const totalRequests = usage.reduce((sum, point) => sum + point.requests, 0);
  const patch = (key: keyof AppSettings, value: boolean) =>
    onChangeSettings({ ...settings, [key]: value });

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header">
        <div>
          <h1>Профиль</h1>
          <p>Локальная статистика и настройки этого устройства.</p>
        </div>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Токены за 7 дней</span>
          <strong>{formatTokens(totalTokens)}</strong>
        </article>
        <article className="metric-card">
          <span>Запросы за 7 дней</span>
          <strong>{totalRequests.toLocaleString('ru-RU')}</strong>
        </article>
        <article className="metric-card">
          <span>Чаты</span>
          <strong>{chatCount.toLocaleString('ru-RU')}</strong>
          <small>{messageCount.toLocaleString('ru-RU')} сообщений</small>
        </article>
        <article className="metric-card">
          <span>Подключения</span>
          <strong>{providerCount.toLocaleString('ru-RU')}</strong>
        </article>
      </div>

      <section className="usage-panel">
        <div className="section-title">
          <div>
            <h2>Использование за 7 дней</h2>
            <p>Счётчики формируются из локальных событий запросов.</p>
          </div>
        </div>
        <div className="usage-chart" aria-label="Токены по дням">
          {usage.map((point) => (
            <div className="usage-column" key={point.label}>
              <span className="usage-value">{formatTokens(point.tokens)}</span>
              <div className="usage-bar-track">
                <i
                  style={{
                    height: `${point.tokens === 0 ? 0 : Math.max(6, (point.tokens / maxTokens) * 100)}%`,
                  }}
                />
              </div>
              <span>{point.label}</span>
              <small>{point.requests}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="settings-layout">
        <section className="settings-panel">
          <div className="section-title">
            <div>
              <h2>Интерфейс</h2>
              <p>Изменения сохраняются в SQLite.</p>
            </div>
            <Icon name="settings" />
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <div>
                <strong>Анимации</strong>
                <small>Переходы и появление элементов</small>
              </div>
              <Toggle
                checked={settings.animations}
                onChange={(value) => patch('animations', value)}
              />
            </div>
            <div className="setting-row">
              <div>
                <strong>Виброотклик</strong>
                <small>Используется на поддерживаемых устройствах</small>
              </div>
              <Toggle
                checked={settings.haptics}
                onChange={(value) => patch('haptics', value)}
              />
            </div>
            <div className="setting-row">
              <div>
                <strong>Компактный режим</strong>
                <small>Уменьшает отступы в интерфейсе</small>
              </div>
              <Toggle
                checked={settings.compactMode}
                onChange={(value) => patch('compactMode', value)}
              />
            </div>
          </div>
        </section>

        <section className="settings-panel">
          <div className="section-title">
            <div>
              <h2>Чаты</h2>
              <p>Поведение редактора сообщений.</p>
            </div>
            <Icon name="chats" />
          </div>
          <div className="settings-list">
            <div className="setting-row">
              <div>
                <strong>Enter отправляет сообщение</strong>
                <small>Shift+Enter добавляет новую строку</small>
              </div>
              <Toggle
                checked={settings.sendOnEnter}
                onChange={(value) => patch('sendOnEnter', value)}
              />
            </div>
            <div className="setting-row">
              <div>
                <strong>Сохранять черновики</strong>
                <small>Текст хранится локально для каждого чата</small>
              </div>
              <Toggle
                checked={settings.saveDrafts}
                onChange={(value) => patch('saveDrafts', value)}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="about-row">
        <div className="app-symbol small">G</div>
        <div>
          <strong>Galactrix</strong>
          <small>Версия приложения из Rust package metadata</small>
        </div>
        <span>{appVersion ? `v${appVersion}` : '—'}</span>
      </section>
    </div>
  );
}
