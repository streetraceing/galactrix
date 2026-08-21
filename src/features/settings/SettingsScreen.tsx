import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTabList } from '../../components/ui/AppTabList';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSwipeableTabs } from '../../hooks/useSwipeableTabs';
import type { AppBackupPreview, AppSettings, Provider } from '../../types';
import { ProfilePreferences } from '../profile/components/ProfilePreferences';
import { AiModulesSettings } from './components/AiModulesSettings';
import { DataManagement } from './components/DataManagement';

type SettingsSection = 'parameters' | 'modules' | 'data';

const settingsSections: readonly SettingsSection[] = [
  'parameters',
  'modules',
  'data',
];

export function SettingsScreen({
  settings,
  providers,
  appVersion,
  onChangeSettings,
  generationActive,
  onCreateBackup,
  onInspectBackup,
  onRestoreBackup,
}: {
  settings: AppSettings;
  providers: Provider[];
  appVersion: string;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
  generationActive: boolean;
  onCreateBackup: (includeCredentials: boolean) => Promise<unknown>;
  onInspectBackup: (archive: unknown) => Promise<AppBackupPreview>;
  onRestoreBackup: (archive: unknown) => Promise<unknown>;
}) {
  const { t } = useTranslation('settings');
  const [section, setSection] = useState<SettingsSection>('parameters');
  const swipeRef = useSwipeableTabs({
    keys: settingsSections,
    selectedKey: section,
    onSelectionChange: setSection,
  });

  return (
    <div ref={swipeRef} className="page-scroll app-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title={t('settingsScreen.settings')}
          description={t('settingsScreen.parametersAndModulesForThisDevice')}
        />

        <Tabs
          selectedKey={section}
          onSelectionChange={(key) =>
            setSection(String(key) as SettingsSection)
          }
          className="w-full"
        >
          <AppTabList
            label={t('settingsScreen.settingsSections')}
            items={[
              { id: 'parameters', label: t('settingsScreen.parameters') },
              { id: 'modules', label: t('settingsScreen.modules') },
              { id: 'data', label: t('settingsScreen.data') },
            ]}
          />

          <Tabs.Panel id="parameters" className="pt-5 sm:pt-6">
            <ProfilePreferences
              settings={settings}
              appVersion={appVersion}
              onChangeSettings={onChangeSettings}
            />
          </Tabs.Panel>
          <Tabs.Panel id="modules" className="pt-5 sm:pt-6">
            <AiModulesSettings
              value={settings.aiModules}
              providers={providers}
              onChange={(aiModules) => {
                void onChangeSettings({ ...settings, aiModules });
              }}
            />
          </Tabs.Panel>
          <Tabs.Panel id="data" className="pt-5 sm:pt-6">
            <DataManagement
              providerCount={providers.length}
              generationActive={generationActive}
              onCreateBackup={onCreateBackup}
              onInspectBackup={onInspectBackup}
              onRestoreBackup={onRestoreBackup}
            />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}
