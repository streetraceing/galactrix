import { Button, Chip } from '@heroui/react';
import type { CSSProperties } from 'react';
import { navigationItems } from '../../app/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TabId } from '../../types';
import { Icon } from '../Icon';

export function DesktopSidebar({
  activeTab,
  chatCount,
  width,
  collapsed,
  onNavigate,
  onToggleCollapsed,
}: {
  activeTab: TabId;
  chatCount: number;
  width: number;
  collapsed: boolean;
  onNavigate: (tab: TabId) => void;
  onToggleCollapsed: () => void;
}) {
  const forcedCompact = useMediaQuery('(max-width: 920px)');
  const compact = collapsed || forcedCompact;

  return (
    <aside
      className="group/sidebar flex h-full w-[min(var(--sidebar-width),30vw)] shrink-0 flex-col border-r border-separator bg-surface transition-[width] min-[1300px]:w-(--sidebar-width)"
      style={
        {
          '--sidebar-width': `${width}px`,
          ...(compact ? { width: 72 } : {}),
        } as CSSProperties
      }
      data-collapsed={compact || undefined}
    >
      <nav
        className="flex flex-1 flex-col gap-1 px-2 pt-3"
        aria-label="Основная навигация"
      >
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            size="lg"
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3 px-3 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:px-0"
            aria-label={item.label}
            title={compact ? item.label : undefined}
            onPress={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium group-data-[collapsed]/sidebar:hidden">
              {item.label}
            </span>
            {item.id === 'chats' && chatCount > 0 ? (
              <Chip
                size="sm"
                variant="soft"
                className="group-data-[collapsed]/sidebar:hidden"
              >
                {chatCount}
              </Chip>
            ) : null}
          </Button>
        ))}
      </nav>

      {!forcedCompact ? (
        <div className="p-2">
          <Button
            fullWidth
            size="sm"
            variant="secondary"
            className="justify-start gap-2 group-data-[collapsed]/sidebar:justify-center"
            aria-label={
              collapsed
                ? 'Развернуть боковую панель'
                : 'Свернуть боковую панель'
            }
            title={collapsed ? 'Развернуть боковую панель' : undefined}
            onPress={onToggleCollapsed}
          >
            <Icon name="sidebar" className="size-4" />
            <span className="group-data-[collapsed]/sidebar:hidden">
              Свернуть панель
            </span>
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
