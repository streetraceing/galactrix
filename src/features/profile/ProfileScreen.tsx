import { MetricGrid } from '../../components/ui/MetricGrid';
import { PageHeader } from '../../components/ui/PageHeader';
import type { AppSettings, UsagePoint } from '../../types';
import { AppInfo } from './components/AppInfo';
import { LayoutSettings } from './components/LayoutSettings';
import { ScaleSettings } from './components/ScaleSettings';
import { SettingsCard } from './components/SettingsCard';
import { SettingSwitchRow } from './components/SettingSwitchRow';
import { ThemeSettings } from './components/ThemeSettings';
import { UsageChart } from './components/UsageChart';
import { formatTokens } from './format';

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
  const totalTokens = usage.reduce((sum, point) => sum + point.tokens, 0);
  const totalRequests = usage.reduce((sum, point) => sum + point.requests, 0);
  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChangeSettings({ ...settings, [key]: value });

  return (
    <div className="page-scroll">
      <div className="page-container">
        <PageHeader
          title="Профиль"
          description="Использование и настройки текущего устройства."
        />

        <MetricGrid
          metrics={[
            { label: 'Токены за 7 дней', value: formatTokens(totalTokens) },
            {
              label: 'Запросы за 7 дней',
              value: totalRequests.toLocaleString('ru-RU'),
            },
            {
              label: 'Чаты',
              value: chatCount.toLocaleString('ru-RU'),
              note: `${messageCount} сообщений`,
            },
            {
              label: 'Подключения',
              value: providerCount.toLocaleString('ru-RU'),
              note: 'на устройстве',
            },
          ]}
        />

        <UsageChart usage={usage} />

        <div className="grid gap-4 md:grid-cols-2">
          <SettingsCard
            icon="settings"
            title="Интерфейс"
            description="Отображение и отклик приложения."
          >
            <SettingSwitchRow
              label="Анимации"
              description="Переходы и появление элементов"
              value={settings.animations}
              onChange={(value) => patch('animations', value)}
            />
            <SettingSwitchRow
              label="Виброотклик"
              description="Используется на поддерживаемых устройствах"
              value={settings.haptics}
              onChange={(value) => patch('haptics', value)}
            />
          </SettingsCard>

          <SettingsCard
            icon="chats"
            title="Чаты"
            description="Поведение редактора сообщений."
          >
            <SettingSwitchRow
              label="Enter отправляет сообщение"
              description="Shift+Enter добавляет новую строку"
              value={settings.sendOnEnter}
              onChange={(value) => patch('sendOnEnter', value)}
            />
            <SettingSwitchRow
              label="Сохранять черновики"
              description="Отдельный черновик для каждого чата"
              value={settings.saveDrafts}
              onChange={(value) => patch('saveDrafts', value)}
            />
          </SettingsCard>
        </div>

        <ThemeSettings
          mode={settings.themeMode}
          variant={settings.themeVariant}
          onModeChange={(value) => patch('themeMode', value)}
          onVariantChange={(value) => patch('themeVariant', value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <ScaleSettings
            value={settings.interfaceScale}
            onChange={(value) => patch('interfaceScale', value)}
          />
          <LayoutSettings
            sidebarWidth={settings.sidebarWidth}
            chatSidebarWidth={settings.chatSidebarWidth}
            onReset={() =>
              onChangeSettings({
                ...settings,
                sidebarWidth: 248,
                chatSidebarWidth: 320,
              })
            }
          />
        </div>
        <div className="md:hidden">
          <AppInfo version={appVersion} />
        </div>
      </div>
    </div>
  );
}
