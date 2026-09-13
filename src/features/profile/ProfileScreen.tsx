import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { AppTabList } from '../../components/ui/AppTabList';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSwipeableTabs } from '../../hooks/useSwipeableTabs';
import type {
  AppSettings,
  BudgetStatus,
  GalaxyItem,
  GalaxyItemInput,
  Provider,
  UsagePoint,
} from '../../types';
import { BudgetsPanel } from './components/BudgetsPanel';
import { IdentitySettings } from './components/IdentitySettings';
import { ProfileOverview } from './components/ProfileOverview';
import { UsageTimeline } from './components/UsageTimeline';
import { useTranslation } from 'react-i18next';

type ProfileSection =
  'overview' | 'tokens' | 'requests' | 'budgets' | 'identities';

const profileSections: readonly ProfileSection[] = [
  'overview',
  'tokens',
  'requests',
  'budgets',
  'identities',
];

export function ProfileScreen({
  usage,
  settings,
  galaxyItems,
  providers,
  chatCount,
  messageCount,
  providerCount,
  onGetBudgetStatus,
  onChangeSettings,
  onSaveGalaxyItem,
}: {
  usage: UsagePoint[];
  settings: AppSettings;
  galaxyItems: GalaxyItem[];
  providers: Provider[];
  chatCount: number;
  messageCount: number;
  providerCount: number;
  onGetBudgetStatus: () => Promise<BudgetStatus[]>;
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
    <div ref={swipeRef} className="page-scroll app-screen-enter flex-1">
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
          <AppTabList
            label={t('profileScreen.profileSections')}
            items={[
              {
                id: 'overview',
                label: t('profileScreen.overview'),
                icon: 'profile',
              },
              {
                id: 'tokens',
                label: t('profileScreen.tokens'),
                icon: 'database',
              },
              {
                id: 'requests',
                label: t('profileScreen.requests'),
                icon: 'send',
              },
              {
                id: 'budgets',
                label: t('profileScreen.budgets'),
                icon: 'shield',
              },
              {
                id: 'identities',
                label: t('profileScreen.identities'),
                icon: 'user',
              },
            ]}
          />

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
          <Tabs.Panel id="budgets" className="pt-5 sm:pt-6">
            <BudgetsPanel
              settings={settings}
              providers={providers}
              onGetStatus={onGetBudgetStatus}
              onChangeSettings={onChangeSettings}
            />
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
