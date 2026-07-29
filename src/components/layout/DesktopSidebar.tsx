import { Button, Chip } from '@heroui/react';
import type { CSSProperties } from 'react';
import {
  primaryNavigationItems,
  settingsNavigationItem,
} from '../../app/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TabId } from '../../types';
import { Icon } from '../Icon';
import { AppAvatar } from '../ui/AppAvatar';
import { useTranslation } from 'react-i18next';

export function DesktopSidebar({
  activeTab,
  chatCount,
  profileName,
  profileAvatar,
  width,
  collapsed,
  onNavigate,
  onToggleCollapsed,
}: {
  activeTab: TabId;
  chatCount: number;
  profileName: string;
  profileAvatar?: string;
  width: number;
  collapsed: boolean;
  onNavigate: (tab: TabId) => void;
  onToggleCollapsed: () => void;
}) {
  const { t } = useTranslation('common');
  const forcedCompact = useMediaQuery('(max-width: 920px)');
  const compact = collapsed || forcedCompact;

  return (
    <aside
      className="group/sidebar bg-background flex h-full w-[min(var(--sidebar-width),30vw)] shrink-0 flex-col border-separator transition-[width] min-[1300px]:w-(--sidebar-width) data-[collapsed=true]:border-r"
      style={
        {
          '--sidebar-width': `${width}px`,
          ...(compact ? { width: 57 } : {}),
        } as CSSProperties
      }
      data-collapsed={compact || undefined}
    >
      <nav
        className="flex flex-1 flex-col gap-1 px-2 pt-3"
        aria-label={t('desktopSidebar.mainNavigation')}
      >
        {primaryNavigationItems.map((item) => (
          <Button
            key={item.id}
            size="lg"
            fullWidth
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            className="justify-start gap-3 px-3 group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0"
            aria-label={item.label}
            onPress={() => onNavigate(item.id)}
          >
            {item.id === 'profile' ? (
              <AppAvatar
                src={profileAvatar}
                name={profileName}
                className="size-6"
              />
            ) : (
              <Icon name={item.icon} className="size-5 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium group-data-collapsed/sidebar:hidden">
              {item.label}
            </span>
            {item.id === 'chats' && chatCount > 0 ? (
              <Chip
                size="sm"
                variant="soft"
                className="bg-transparent group-data-collapsed/sidebar:hidden"
              >
                {chatCount}
              </Chip>
            ) : null}
          </Button>
        ))}
      </nav>

      <div className="space-y-1 p-2">
        {!forcedCompact ? (
          <Button
            fullWidth
            size="lg"
            variant="ghost"
            className="justify-start gap-2 group-data-collapsed/sidebar:justify-center"
            aria-label={
              collapsed
                ? t('desktopSidebar.expandSidebar')
                : t('desktopSidebar.collapseSidebar')
            }
            onPress={onToggleCollapsed}
          >
            <Icon name="sidebar" className="size-4" />
            <span className="group-data-collapsed/sidebar:hidden">
              {t('desktopSidebar.collapsePanel')}
            </span>
          </Button>
        ) : null}
        <Button
          fullWidth
          size="lg"
          variant={
            activeTab === settingsNavigationItem.id ? 'secondary' : 'ghost'
          }
          className="justify-start gap-2 group-data-collapsed/sidebar:justify-center"
          aria-label={settingsNavigationItem.label}
          onPress={() => onNavigate(settingsNavigationItem.id)}
        >
          <Icon name="settings" className="size-4" />
          <span className="group-data-collapsed/sidebar:hidden">
            {settingsNavigationItem.label}
          </span>
        </Button>
      </div>
    </aside>
  );
}
