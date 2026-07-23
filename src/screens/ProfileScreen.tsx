import { Button, Surface, Switch } from '@heroui/react';
import { BrandMark } from '../components/BrandMark';
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
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-medium">{label}</strong>
        <p className="mt-0.5 text-xs leading-5 app-muted">{description}</p>
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
  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChangeSettings({ ...settings, [key]: value });
  const scales = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5];

  return (
    <div className="app-page-scroll scrollbar-thin">
      <div className="app-page-container">
        <header className="app-page-header">
          <h1 className="app-page-title">Профиль</h1>
          <p className="app-page-description">
            Статистика использования и настройки этого устройства.
          </p>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Токены за 7 дней', formatTokens(totalTokens), ''],
            ['Запросы за 7 дней', totalRequests.toLocaleString('ru-RU'), ''],
            [
              'Чаты',
              chatCount.toLocaleString('ru-RU'),
              `${messageCount} сообщений`,
            ],
            ['Подключения', providerCount.toLocaleString('ru-RU'), ''],
          ].map(([label, value, note]) => (
            <Surface key={label} variant="secondary" className="p-5">
              <span className="text-sm app-muted">{label}</span>
              <strong className="mt-2 block text-2xl font-semibold">
                {value}
              </strong>
              {note && (
                <span className="mt-1 block text-xs app-muted">{note}</span>
              )}
            </Surface>
          ))}
        </div>

        <Surface variant="secondary" className="mt-4 p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Использование за 7 дней</h2>
            <p className="mt-1 text-xs app-muted">
              Токены и количество запросов по дням.
            </p>
          </div>
          <div
            className="mt-6 grid h-56 grid-cols-7 gap-2"
            aria-label="Токены по дням"
          >
            {usage.map((point) => (
              <div
                key={point.label}
                className="flex min-w-0 flex-col items-center"
              >
                <span className="mb-2 truncate text-[0.65rem] app-muted">
                  {formatTokens(point.tokens)}
                </span>
                <div className="app-chart-track flex min-h-0 w-full flex-1 items-end overflow-hidden rounded-lg p-1">
                  <div
                    className="app-chart-bar w-full rounded-md"
                    style={{
                      height: `${point.tokens === 0 ? 0 : Math.max(5, (point.tokens / maxTokens) * 100)}%`,
                    }}
                  />
                </div>
                <strong className="mt-2 text-xs font-medium">
                  {point.label}
                </strong>
                <span className="text-[0.65rem] app-muted">
                  {point.requests}
                </span>
              </div>
            ))}
          </div>
        </Surface>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Surface variant="secondary" className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="app-accent-tile grid size-9 shrink-0 place-items-center rounded-xl">
                <Icon name="settings" className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Интерфейс</h2>
                <p className="mt-1 text-xs app-muted">
                  Отображение и отклик приложения.
                </p>
              </div>
            </div>
            <div className="app-divided-list mt-4">
              <SettingSwitch
                label="Анимации"
                description="Переходы и появление элементов"
                value={settings.animations}
                onChange={(value) => patch('animations', value)}
              />
              <SettingSwitch
                label="Виброотклик"
                description="Используется на поддерживаемых устройствах"
                value={settings.haptics}
                onChange={(value) => patch('haptics', value)}
              />
            </div>
          </Surface>

          <Surface variant="secondary" className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="app-accent-tile grid size-9 shrink-0 place-items-center rounded-xl">
                <Icon name="chats" className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Чаты</h2>
                <p className="mt-1 text-xs app-muted">
                  Поведение редактора сообщений.
                </p>
              </div>
            </div>
            <div className="app-divided-list mt-4">
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
        </div>

        <Surface variant="secondary" className="mt-4 p-5 sm:p-6">
          <div className="app-page-header">
            <div>
              <h2 className="font-semibold">Масштаб интерфейса</h2>
              <p className="mt-1 text-xs leading-5 app-muted">
                Текущий масштаб: {Math.round(settings.interfaceScale * 100)}%.
                Изменение применяется ко всему интерфейсу.
              </p>
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
          <div className="mt-4 flex flex-wrap gap-2">
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
        </Surface>

        <Surface variant="secondary" className="mt-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Ширина панелей</h2>
              <p className="mt-1 text-xs leading-5 app-muted">
                Основная: {Math.round(settings.sidebarWidth)} px · Чаты:{' '}
                {Math.round(settings.chatSidebarWidth)} px
              </p>
            </div>
            <Button
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

        <Surface
          variant="secondary"
          className="mt-4 flex items-center gap-3 p-4"
        >
          <BrandMark size={40} />
          <div className="min-w-0 flex-1">
            <strong className="block">Galactrix</strong>
            <span className="text-xs app-muted">Версия приложения</span>
          </div>
          <span className="text-sm app-muted">
            {appVersion ? `v${appVersion}` : '—'}
          </span>
        </Surface>
      </div>
    </div>
  );
}
