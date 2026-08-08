import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSwipeableTabs } from '../../hooks/useSwipeableTabs';
import type {
  AppSettings,
  GalaxyItem,
  GalaxyItemInput,
  UsagePoint,
} from '../../types';
import { IdentitySettings } from './components/IdentitySettings';
import { ProfileOverview } from './components/ProfileOverview';
import { UsageTimeline } from './components/UsageTimeline';
import { useTranslation } from 'react-i18next';

type ProfileSection = 'overview' | 'tokens' | 'requests' | 'identities';

const profileSections: readonly ProfileSection[] = [
  'overview',
  'tokens',
  'requests',
  'identities',
];

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
  const { t } = useTranslation('profile');
  const [section, setSection] = useState<ProfileSection>('overview');
  const swipeRef = useSwipeableTabs({
    keys: profileSections,
    selectedKey: section,
    onSelectionChange: setSection,
  });

  return (
    <div ref={swipeRef} className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title={t('profileScreen.profile')}
          description={t('profileScreen.activityAndChatIdentities')}
        />

        <Tabs
          selectedKey={section}
          onSelectionChange={(key) => setSection(String(key) as ProfileSection)}
          className="w-full"
        >
          <Tabs.ListContainer className="w-full">
            <Tabs.List
              aria-label={t('profileScreen.profileSections')}
              className="w-full *:min-w-0 *:flex-1 *:gap-1.5 *:px-2 sm:*:px-4"
            >
              <Tabs.Tab id="overview">
                <Icon name="profile" className="size-4 shrink-0" />
                {t('profileScreen.overview')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="tokens">
                <Icon name="database" className="size-4 shrink-0" />
                {t('profileScreen.tokens')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="requests">
                <Icon name="send" className="size-4 shrink-0" />
                {t('profileScreen.requests')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="identities">
                <Icon name="user" className="size-4 shrink-0" />
                {t('profileScreen.identities')}
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
