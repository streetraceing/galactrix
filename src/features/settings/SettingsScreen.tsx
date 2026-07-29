import { PageHeader } from '../../components/ui/PageHeader';
import type { AppSettings } from '../../types';
import { ProfilePreferences } from '../profile/components/ProfilePreferences';

export function SettingsScreen({
  settings,
  appVersion,
  onChangeSettings,
}: {
  settings: AppSettings;
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  return (
    <div className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title="Настройки"
          description="Интерфейс, поведение чатов и параметры этого устройства."
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
