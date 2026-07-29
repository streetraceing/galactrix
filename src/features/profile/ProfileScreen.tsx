import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import type {
  AppSettings,
  GalaxyItem,
  GalaxyItemInput,
  UsagePoint,
} from '../../types';
import { IdentitySettings } from './components/IdentitySettings';
import { ProfileOverview } from './components/ProfileOverview';
import { UsageTimeline } from './components/UsageTimeline';

type ProfileSection = 'overview' | 'tokens' | 'requests' | 'identities';

export function ProfileScreen({
  usage,
  settings,
  galaxyItems,
  chatCount,
  messageCount,
  providerCount,
  onChangeSettings,
  onSaveGalaxyItem,
}: {
  usage: UsagePoint[];
  settings: AppSettings;
  galaxyItems: GalaxyItem[];
  chatCount: number;
  messageCount: number;
  providerCount: number;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
  onSaveGalaxyItem: (item: GalaxyItemInput) => Promise<void>;
}) {
  const [section, setSection] = useState<ProfileSection>('overview');

  return (
    <div className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title="Профиль"
          description="Активность и образы для общения."
        />

        <Tabs
          selectedKey={section}
          onSelectionChange={(key) => setSection(String(key) as ProfileSection)}
          className="w-full"
        >
          <Tabs.ListContainer className="w-full">
            <Tabs.List
              aria-label="Разделы профиля"
              className="w-full *:min-w-0 *:flex-1 *:px-2 sm:*:px-4"
            >
              <Tabs.Tab id="overview">
                Обзор
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="tokens">
                Токены
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="requests">
                Запросы
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="identities">
                Образы
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="overview" className="pt-5 sm:pt-6">
            <ProfileOverview
              usage={usage}
              chatCount={chatCount}
              messageCount={messageCount}
              providerCount={providerCount}
              galaxyItems={galaxyItems}
            />
          </Tabs.Panel>
          <Tabs.Panel id="tokens" className="pt-5 sm:pt-6">
            <UsageTimeline usage={usage} metric="tokens" />
          </Tabs.Panel>
          <Tabs.Panel id="requests" className="pt-5 sm:pt-6">
            <UsageTimeline usage={usage} metric="requests" />
          </Tabs.Panel>
          <Tabs.Panel id="identities" className="pt-5 sm:pt-6">
            <IdentitySettings
              settings={settings}
              galaxyItems={galaxyItems}
              onChangeSettings={onChangeSettings}
              onSaveGalaxyItem={onSaveGalaxyItem}
            />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}
