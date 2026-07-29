import { PageHeader } from '../../components/ui/PageHeader';
import type { AppSettings } from '../../types';
import { ProfilePreferences } from '../profile/components/ProfilePreferences';
import { useTranslation } from 'react-i18next';

export function SettingsScreen({
  settings,
  appVersion,
  onChangeSettings,
}: {
  settings: AppSettings;
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
        <ProfilePreferences
          settings={settings}
          appVersion={appVersion}
          onChangeSettings={onChangeSettings}
        />
      </div>
    </div>
  );
}
