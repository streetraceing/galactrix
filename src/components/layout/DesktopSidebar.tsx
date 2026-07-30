import { Button, Chip } from '@heroui/react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  primaryNavigationItems,
  settingsNavigationItem,
  type NavigationItem,
} from '../../app/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TabId } from '../../types';
import { Icon } from '../Icon';
import { AppAvatar } from '../ui/AppAvatar';
import { AppTooltip } from '../ui/AppTooltip';

type SidebarButtonProps = {
  item: NavigationItem;
  active: boolean;
  compact: boolean;
  count?: number;
  profileName: string;
  profileAvatar?: string;
  onPress: () => void;
};

const sidebarButtonClass =
  'h-10 w-full min-w-0 shrink-0 justify-start gap-3 overflow-hidden px-3 transition-[gap,padding,background-color,color] duration-[280ms] ease-[var(--motion-ease)] motion-reduce:transition-none group-data-[collapsed=true]/sidebar:gap-0 ring-0! ring-transparent!';

function SidebarText({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-0 flex-1 truncate translate-x-0 overflow-hidden whitespace-nowrap text-left text-sm font-medium opacity-100 transition-[max-width,opacity,transform] duration-240 ease-(--motion-ease) group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:-translate-x-1 group-data-[collapsed=true]/sidebar:opacity-0 group-data-[collapsed=false]/sidebar:delay-75">
      {children}
    </span>
  );
}

function SidebarButton({
  item,
  active,
  compact,
  count,
  profileName,
  profileAvatar,
  onPress,
}: SidebarButtonProps) {
  const button = (
    <Button
      size="lg"
      fullWidth
      variant={active ? 'secondary' : 'ghost'}
      className={`${sidebarButtonClass}`}
      aria-label={item.label}
      onPress={onPress}
    >
      <span className="grid size-6 shrink-0 place-items-center">
        {item.id === 'profile' ? (
          <AppAvatar
            src={profileAvatar}
            name={profileName}
            className="size-5"
          />
        ) : (
          <Icon name={item.icon} className="size-5 shrink-0" />
        )}
      </span>
      <SidebarText>{item.label}</SidebarText>
      {count && count > 0 ? (
        <Chip
          size="sm"
          variant="soft"
          className="max-w-14 shrink-0 overflow-hidden bg-transparent opacity-100 transition-[max-width,opacity,transform] duration-220 ease-(--motion-ease) group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:translate-x-1 group-data-[collapsed=true]/sidebar:opacity-0 group-data-[collapsed=false]/sidebar:delay-75"
        >
          {count}
        </Chip>
      ) : null}
    </Button>
  );

  return (
    <div className="h-10 w-full overflow-hidden">
      <AppTooltip
        content={item.label}
        placement="right"
        disabled={!compact}
        triggerClassName="block size-full overflow-hidden"
      >
        {button}
      </AppTooltip>
    </div>
  );
}

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
  const resolvedWidth = compact ? 64 : width;
  const collapseLabel = collapsed
    ? t('desktopSidebar.expandSidebar')
    : t('desktopSidebar.collapseSidebar');

  return (
    <aside
      className="group/sidebar relative isolate flex h-full shrink-0 transform-gpu flex-col overflow-hidden border-r border-separator bg-background transition-[width] duration-320 ease-(--motion-ease) contain-[layout_paint] motion-reduce:transition-none"
      style={{ width: `${resolvedWidth}px` } as CSSProperties}
      data-collapsed={compact}
      aria-label={t('desktopSidebar.mainNavigation')}
    >
      <nav className="flex flex-1 flex-col gap-1 px-2 pt-3">
        {primaryNavigationItems.map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            compact={compact}
            count={item.id === 'chats' ? chatCount : undefined}
            profileName={profileName}
            profileAvatar={profileAvatar}
            onPress={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      <div className="grid shrink-0 grid-cols-1 auto-rows-10 gap-1 overflow-hidden p-2 contain-[layout_paint]">
        {!forcedCompact ? (
          <div className="h-10 w-full overflow-hidden">
            <AppTooltip
              content={collapseLabel}
              placement="right"
              disabled={!compact}
              triggerClassName="block size-full overflow-hidden"
            >
              <Button
                fullWidth
                size="lg"
                variant="ghost"
                className={sidebarButtonClass}
                aria-label={collapseLabel}
                aria-expanded={!collapsed}
                onPress={onToggleCollapsed}
              >
                <span className="grid size-6 shrink-0 place-items-center">
                  <Icon name="sidebar" className="size-4" />
                </span>
                <SidebarText>{collapseLabel}</SidebarText>
              </Button>
            </AppTooltip>
          </div>
        ) : null}

        <SidebarButton
          item={settingsNavigationItem}
          active={activeTab === settingsNavigationItem.id}
          compact={compact}
          profileName={profileName}
          profileAvatar={profileAvatar}
          onPress={() => onNavigate(settingsNavigationItem.id)}
        />
      </div>
    </aside>
  );
}
