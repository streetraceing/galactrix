import type { AppSettings } from '../../../types';
import { AppInfo } from './AppInfo';
import { LayoutSettings } from './LayoutSettings';
import { LanguageSettings } from './LanguageSettings';
import { ScaleSettings } from './ScaleSettings';
import { SettingsCard } from './SettingsCard';
import { SettingSwitchRow } from './SettingSwitchRow';
import { ThemeSettings } from './ThemeSettings';
import { useTranslation } from 'react-i18next';

export function ProfilePreferences({
  settings,
  appVersion,
  onChangeSettings,
}: {
  settings: AppSettings;
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const { t } = useTranslation('profile');
  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    void onChangeSettings({ ...settings, [key]: value });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard
          icon="settings"
          title={t('profilePreferences.interface')}
          description={t('profilePreferences.appAppearanceAndFeedback')}
        >
          <SettingSwitchRow
            label={t('profilePreferences.animations')}
            description={t(
              'profilePreferences.transitionsElementEntrancesAndGestures',
            )}
            value={settings.animations}
            onChange={(value) => patch('animations', value)}
          />
          <SettingSwitchRow
            label={t('profilePreferences.compactMode')}
            description={t(
              'profilePreferences.lessSpacingAndMoreInformationOnScreen',
            )}
            value={settings.compactMode}
            onChange={(value) => patch('compactMode', value)}
          />
          <SettingSwitchRow
            label={t('profilePreferences.hapticFeedback')}
            description={t('profilePreferences.usedOnSupportedDevices')}
            value={settings.haptics}
            onChange={(value) => patch('haptics', value)}
          />
        </SettingsCard>

        <SettingsCard
          icon="chats"
          title={t('profileOverview.chats')}
          description={t('profilePreferences.messageEditorBehavior')}
        >
          <SettingSwitchRow
            label={t('profilePreferences.enterSendsMessage')}
            description={t('profilePreferences.shiftEnterInsertsANewLine')}
            value={settings.sendOnEnter}
            onChange={(value) => patch('sendOnEnter', value)}
          />
          <SettingSwitchRow
            label={t('profilePreferences.saveDrafts')}
            description={t('profilePreferences.aSeparateDraftForEachChat')}
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
