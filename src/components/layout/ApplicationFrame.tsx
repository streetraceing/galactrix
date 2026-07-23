import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { navigationItems } from '../../app/navigation';
import type { AppSettings, TabId } from '../../types';
import { ResizeHandle } from '../ResizeHandle';
import { AppNotice } from './AppNotice';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { MobileHeader } from './MobileHeader';

export function ApplicationFrame({
  activeTab,
  settings,
  chatCount,
  appVersion,
  loading,
  notice,
  children,
  onNavigate,
  onNewChat,
  onCloseNotice,
  onSettingsPreview,
  onSettingsCommit,
}: {
  activeTab: TabId;
  settings: AppSettings;
  chatCount: number;
  appVersion: string;
  loading: boolean;
  notice: string;
  children: ReactNode;
  onNavigate: (tab: TabId) => void;
  onNewChat: () => void;
  onCloseNotice: () => void;
  onSettingsPreview: (settings: AppSettings) => void;
  onSettingsCommit: (settings: AppSettings) => void;
}) {
  const activeLabel =
    navigationItems.find((item) => item.id === activeTab)?.label ?? '';

  return (
    <main className="flex h-full min-w-0 overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        activeTab={activeTab}
        chatCount={chatCount}
        appVersion={appVersion}
        width={settings.sidebarWidth}
        onNavigate={onNavigate}
      />
      <ResizeHandle
        value={settings.sidebarWidth}
        min={196}
        max={420}
        label="Изменить ширину основной панели"
        onChange={(sidebarWidth) =>
          onSettingsPreview({ ...settings, sidebarWidth })
        }
        onCommit={(sidebarWidth) =>
          onSettingsCommit({ ...settings, sidebarWidth })
        }
      />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader
          title={activeLabel}
          activeTab={activeTab}
          onNewChat={onNewChat}
        />

        {loading ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-sm">
            <Spinner aria-label="Загрузка" />
          </div>
        ) : null}

        <AppNotice message={notice} onClose={onCloseNotice} />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        <MobileBottomNavigation activeTab={activeTab} onNavigate={onNavigate} />
      </section>
    </main>
  );
}
