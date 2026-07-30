import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { isMobilePlatform } from '../../lib/platform';
import { resolveProfileName } from '../../lib/profile';
import type { AppSettings, Chat, TabId } from '../../types';
import { ResizeHandle } from '../ResizeHandle';
import { AppNotice } from './AppNotice';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopTitlebar } from './DesktopTitlebar';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { useTranslation } from 'react-i18next';

export function ApplicationFrame({
  activeTab,
  settings,
  chats,
  loading,
  notice,
  mobileNavigationVisible,
  children,
  onNavigate,
  onOpenChat,
  onCloseNotice,
  onSettingsPreview,
  onSettingsCommit,
}: {
  activeTab: TabId;
  settings: AppSettings;
  chats: Chat[];
  loading: boolean;
  notice: string;
  mobileNavigationVisible: boolean;
  children: ReactNode;
  onNavigate: (tab: TabId) => void;
  onOpenChat: (chatId: string) => void;
  onCloseNotice: () => void;
  onSettingsPreview: (settings: AppSettings) => void;
  onSettingsCommit: (settings: AppSettings) => void;
}) {
  const { t } = useTranslation('common');
  const isMobile = isMobilePlatform();
  const displayProfileName = resolveProfileName(
    settings.profileName,
    t('user.defaultName'),
  );

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <DesktopTitlebar
        activeTab={activeTab}
        chats={chats}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
        onToggleSidebar={() =>
          onSettingsCommit({
            ...settings,
            sidebarCollapsed: !settings.sidebarCollapsed,
          })
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        {!isMobile ? (
          <DesktopSidebar
            activeTab={activeTab}
            chatCount={chats.length}
            profileName={displayProfileName}
            profileAvatar={settings.profileAvatar}
            width={settings.sidebarWidth}
            collapsed={settings.sidebarCollapsed}
            onNavigate={onNavigate}
            onToggleCollapsed={() =>
              onSettingsCommit({
                ...settings,
                sidebarCollapsed: !settings.sidebarCollapsed,
              })
            }
          />
        ) : null}
        {!isMobile && !settings.sidebarCollapsed ? (
          <ResizeHandle
            value={settings.sidebarWidth}
            min={196}
            max={420}
            className="max-[1300px]:hidden"
            label={t('applicationFrame.changeMainSidebarWidth')}
            onChange={(sidebarWidth) =>
              onSettingsPreview({ ...settings, sidebarWidth })
            }
            onCommit={(sidebarWidth) =>
              onSettingsCommit({ ...settings, sidebarWidth })
            }
            shift
          />
        ) : null}

        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {loading ? (
            <div className="absolute inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-sm">
              <Spinner aria-label={t('applicationFrame.loading')} />
            </div>
          ) : null}

          <AppNotice message={notice} onClose={onCloseNotice} />
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {children}
          </div>
          {isMobile && mobileNavigationVisible ? (
            <MobileBottomNavigation
              activeTab={activeTab}
              profileName={displayProfileName}
              profileAvatar={settings.profileAvatar}
              onNavigate={onNavigate}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
