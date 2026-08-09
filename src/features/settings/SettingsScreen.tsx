import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSwipeableTabs } from '../../hooks/useSwipeableTabs';
import type { AppSettings, Provider } from '../../types';
import { ProfilePreferences } from '../profile/components/ProfilePreferences';
import { AiModulesSettings } from './components/AiModulesSettings';

type SettingsSection = 'parameters' | 'modules';

const settingsSections: readonly SettingsSection[] = ['parameters', 'modules'];

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
          <Tabs.ListContainer className="w-full">
            <Tabs.List
              aria-label={t('settingsScreen.settingsSections')}
              className="w-full *:min-w-0 *:flex-1 *:px-3 sm:*:px-4"
            >
              <Tabs.Tab id="parameters">
                {t('settingsScreen.parameters')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="modules">
                {t('settingsScreen.modules')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

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
        </Tabs>
      </div>
    </div>
  );
}
