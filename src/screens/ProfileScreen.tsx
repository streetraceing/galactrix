import { Button, Surface, Switch } from '@heroui/react';
import { Icon } from '../components/Icon';
import type { AppSettings, UsagePoint } from '../types';

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString('ru-RU');
}

function SettingSwitch({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="app-setting-row">
      <div className="min-w-0 flex-1">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <Switch isSelected={value} onChange={onChange} aria-label={label}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}

export function ProfileScreen({
  usage,
  settings,
  chatCount,
  messageCount,
  providerCount,
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
  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChangeSettings({ ...settings, [key]: value });
  const scales = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5];

  return (
    <div className="app-page-scroll scrollbar-thin">
      <div className="app-page-container">
        <header className="app-page-header">
          <div>
            <h1 className="app-page-title">Профиль</h1>
            <p className="app-page-description">
              Использование и настройки текущего устройства.
            </p>
          </div>
        </header>

        <Surface
          variant="secondary"
          className="app-panel app-stat-strip app-stat-strip-four mt-5"
        >
          {[
            ['Токены', formatTokens(totalTokens), 'за 7 дней'],
            ['Запросы', totalRequests.toLocaleString('ru-RU'), 'за 7 дней'],
            [
              'Чаты',
              chatCount.toLocaleString('ru-RU'),
              `${messageCount} сообщений`,
            ],
            [
              'Подключения',
              providerCount.toLocaleString('ru-RU'),
              'на устройстве',
            ],
          ].map(([label, value, note]) => (
            <div key={label} className="app-stat-item">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
        </Surface>

        <div className="app-profile-dashboard mt-4">
          <Surface variant="secondary" className="app-panel app-usage-panel">
            <div className="app-section-heading">
              <div>
                <h2>Использование за 7 дней</h2>
                <p>Токены и запросы по дням.</p>
              </div>
              <span className="app-muted text-xs">
                {formatTokens(totalTokens)} токенов
              </span>
            </div>
            <div className="app-usage-chart" aria-label="Токены по дням">
              {usage.map((point) => (
                <div key={point.label} className="app-usage-column">
                  <span className="app-muted app-usage-value">
                    {formatTokens(point.tokens)}
                  </span>
                  <div className="app-chart-track app-usage-track">
                    <div
                      className="app-chart-bar app-usage-bar"
                      style={{
                        height: `${point.tokens === 0 ? 0 : Math.max(6, (point.tokens / maxTokens) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{point.label}</strong>
                  <span className="app-muted">{point.requests}</span>
                </div>
              ))}
            </div>
          </Surface>

          <Surface variant="secondary" className="app-panel app-settings-panel">
            <div className="app-section-heading">
              <div className="flex items-center gap-3">
                <span className="app-accent-tile app-section-icon">
                  <Icon name="settings" className="size-5" />
                </span>
                <div>
                  <h2>Интерфейс</h2>
                  <p>Отображение и отклик.</p>
                </div>
              </div>
            </div>
            <div className="app-divided-list mt-3">
              <SettingSwitch
                label="Анимации"
                description="Переходы и появление элементов"
                value={settings.animations}
                onChange={(value) => patch('animations', value)}
              />
              <SettingSwitch
                label="Виброотклик"
                description="На поддерживаемых устройствах"
                value={settings.haptics}
                onChange={(value) => patch('haptics', value)}
              />
            </div>
          </Surface>
        </div>

        <div className="app-settings-grid mt-4">
          <Surface variant="secondary" className="app-panel app-settings-panel">
            <div className="app-section-heading">
              <div className="flex items-center gap-3">
                <span className="app-accent-tile app-section-icon">
                  <Icon name="chats" className="size-5" />
                </span>
                <div>
                  <h2>Чаты</h2>
                  <p>Поведение редактора сообщений.</p>
                </div>
              </div>
            </div>
            <div className="app-divided-list mt-3">
              <SettingSwitch
                label="Enter отправляет сообщение"
                description="Shift+Enter добавляет новую строку"
                value={settings.sendOnEnter}
                onChange={(value) => patch('sendOnEnter', value)}
              />
              <SettingSwitch
                label="Сохранять черновики"
                description="Отдельный черновик для каждого чата"
                value={settings.saveDrafts}
                onChange={(value) => patch('saveDrafts', value)}
              />
            </div>
          </Surface>

          <Surface variant="secondary" className="app-panel app-settings-panel">
            <div className="app-section-heading">
              <div>
                <h2>Масштаб интерфейса</h2>
                <p>Сейчас {Math.round(settings.interfaceScale * 100)}%.</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={settings.interfaceScale === 1}
                onPress={() => patch('interfaceScale', 1)}
              >
                Сбросить
              </Button>
            </div>
            <div className="app-scale-options mt-4">
              {scales.map((scale) => (
                <Button
                  key={scale}
                  size="sm"
                  variant={
                    settings.interfaceScale === scale ? 'secondary' : 'ghost'
                  }
                  onPress={() => patch('interfaceScale', scale)}
                >
                  {Math.round(scale * 100)}%
                </Button>
              ))}
            </div>
            <div className="app-panel-width-row">
              <div>
                <strong>Ширина панелей</strong>
                <p>
                  Основная {Math.round(settings.sidebarWidth)} px · Чаты{' '}
                  {Math.round(settings.chatSidebarWidth)} px
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onPress={() =>
                  onChangeSettings({
                    ...settings,
                    sidebarWidth: 248,
                    chatSidebarWidth: 320,
                  })
                }
              >
                Сбросить ширину
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
