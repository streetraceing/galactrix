import { PageHeader } from '../../components/ui/PageHeader';
import type { AppSettings, Provider } from '../../types';
import { ProfilePreferences } from '../profile/components/ProfilePreferences';
import { AiModulesSettings } from './components/AiModulesSettings';
import { useTranslation } from 'react-i18next';

export function SettingsScreen({
  settings,
  providers,
  appVersion,
  onChangeSettings,
}: {
  settings: AppSettings;
  providers: Provider[];
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const { t } = useTranslation('settings');
  return (
    <div className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title={t('settingsScreen.settings')}
          description={t(
            'settingsScreen.interfaceChatBehaviorAndSettingsForThisDevice',
          )}
        />
        <div className="space-y-4 sm:space-y-5">
          <AiModulesSettings
            value={settings.aiModules}
            providers={providers}
            onChange={(aiModules) => {
              void onChangeSettings({ ...settings, aiModules });
            }}
          />
          <ProfilePreferences
            settings={settings}
            appVersion={appVersion}
            onChangeSettings={onChangeSettings}
          />
        </div>
      </div>
    </div>
  );
}
