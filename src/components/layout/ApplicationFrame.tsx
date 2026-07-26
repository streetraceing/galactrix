import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { isMobilePlatform } from '../../lib/platform';
import type { AppSettings, Chat, TabId } from '../../types';
import { ResizeHandle } from '../ResizeHandle';
import { AppNotice } from './AppNotice';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopTitlebar } from './DesktopTitlebar';
import { MobileBottomNavigation } from './MobileBottomNavigation';

export function ApplicationFrame({
  activeTab,
  settings,
  chats,
  chatCount,
  loading,
  notice,
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
  chatCount: number;
  loading: boolean;
  notice: string;
  children: ReactNode;
  onNavigate: (tab: TabId) => void;
  onOpenChat: (chatId: string) => void;
  onCloseNotice: () => void;
  onSettingsPreview: (settings: AppSettings) => void;
  onSettingsCommit: (settings: AppSettings) => void;
}) {
  const isMobile = isMobilePlatform();

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <DesktopTitlebar
        activeTab={activeTab}
        chats={chats}
        onNavigate={onNavigate}
        onOpenChat={onOpenChat}
      />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        {!isMobile ? (
          <DesktopSidebar
            activeTab={activeTab}
            chatCount={chatCount}
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
            label="Изменить ширину основной панели"
            onChange={(sidebarWidth) =>
              onSettingsPreview({ ...settings, sidebarWidth })
            }
            onCommit={(sidebarWidth) =>
              onSettingsCommit({ ...settings, sidebarWidth })
            }
          />
        ) : null}

        <section
          className={`relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background`}
        >
          {loading ? (
            <div className="absolute inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-sm">
              <Spinner aria-label="Загрузка" />
            </div>
          ) : null}

          <AppNotice message={notice} onClose={onCloseNotice} />
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden flex">
            {children}
          </div>
          {isMobile ? (
            <MobileBottomNavigation
              activeTab={activeTab}
              onNavigate={onNavigate}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
