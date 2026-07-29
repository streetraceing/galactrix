import type { AppSettings } from '../../../types';
import { AppInfo } from './AppInfo';
import { LayoutSettings } from './LayoutSettings';
import { LanguageSettings } from './LanguageSettings';
import { ScaleSettings } from './ScaleSettings';
import { SettingsCard } from './SettingsCard';
import { SettingSwitchRow } from './SettingSwitchRow';
import { ThemeSettings } from './ThemeSettings';

export function ProfilePreferences({
  settings,
  appVersion,
  onChangeSettings,
}: {
  settings: AppSettings;
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    void onChangeSettings({ ...settings, [key]: value });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard
          icon="settings"
          title="Интерфейс"
          description="Отображение и отклик приложения."
        >
          <SettingSwitchRow
            label="Анимации"
            description="Переходы, появление элементов и жесты"
            value={settings.animations}
            onChange={(value) => patch('animations', value)}
          />
          <SettingSwitchRow
            label="Компактный режим"
            description="Меньше отступов и больше информации на экране"
            value={settings.compactMode}
            onChange={(value) => patch('compactMode', value)}
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

      <LanguageSettings
        value={settings.language}
        onChange={(value) => patch('language', value)}
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
            void onChangeSettings({
              ...settings,
              sidebarWidth: 248,
              chatSidebarWidth: 320,
            })
          }
        />
      </div>

      <AppInfo version={appVersion} />
    </div>
  );
}
