import { Spinner } from '@heroui/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { isMobilePlatform } from '../../lib/platform';
import { useMobileKeyboardVisibility } from '../../hooks/useMobileKeyboardVisibility';
import { resolveProfileName } from '../../lib/profile';
import type { AppSettings, Chat, TabId } from '../../types';
import { ResizeHandle } from '../ResizeHandle';
import { AppNotice } from './AppNotice';
import {
  DESKTOP_SIDEBAR_COLLAPSED_WIDTH,
  DesktopSidebar,
} from './DesktopSidebar';
import { DesktopTitlebar } from './DesktopTitlebar';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { useTranslation } from 'react-i18next';

export function ApplicationFrame({
  activeTab,
  chatMaximized,
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
  chatMaximized: boolean;
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
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const isMobile = isMobilePlatform();
  const mobileKeyboardVisible = useMobileKeyboardVisibility(isMobile);
  const hideDesktopNavigation =
    !isMobile && activeTab === 'chats' && chatMaximized;
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
        {!isMobile && !hideDesktopNavigation ? (
          <DesktopSidebar
            activeTab={activeTab}
            chatCount={chats.length}
            profileName={displayProfileName}
            profileAvatar={settings.profileAvatar}
            width={settings.sidebarWidth}
            collapsed={settings.sidebarCollapsed}
            resizing={sidebarResizing}
            onNavigate={onNavigate}
            onToggleCollapsed={() =>
              onSettingsCommit({
                ...settings,
                sidebarCollapsed: !settings.sidebarCollapsed,
              })
            }
          />
        ) : null}
        {!isMobile && !hideDesktopNavigation ? (
          <ResizeHandle
            value={settings.sidebarWidth}
            min={196}
            max={420}
            collapsed={settings.sidebarCollapsed}
            collapsedValue={DESKTOP_SIDEBAR_COLLAPSED_WIDTH}
            collapseThreshold={48}
            resumeThreshold={12}
            className="max-[920px]:hidden"
            label={t('applicationFrame.changeMainSidebarWidth')}
            onResizeStart={() => setSidebarResizing(true)}
            onResizeEnd={() => setSidebarResizing(false)}
            onChange={(sidebarWidth) =>
              onSettingsPreview({
                ...settings,
                sidebarWidth,
                sidebarCollapsed: false,
              })
            }
            onCommit={(sidebarWidth) =>
              onSettingsCommit({
                ...settings,
                sidebarWidth,
                sidebarCollapsed: false,
              })
            }
            onCollapse={() =>
              onSettingsPreview({ ...settings, sidebarCollapsed: true })
            }
            onCollapseCommit={() =>
              onSettingsCommit({ ...settings, sidebarCollapsed: true })
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
          {isMobile && mobileNavigationVisible && !mobileKeyboardVisible ? (
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
