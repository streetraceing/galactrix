import { Button } from '@heroui/react';
import { navigationItems } from '../../app/navigation';
import type { TabId } from '../../types';
import { Icon } from '../Icon';

export function MobileBottomNavigation({
  activeTab,
  onNavigate,
}: {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <nav
      className="grid h-20 shrink-0 grid-cols-4 border-t border-separator bg-surface px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Мобильная навигация"
    >
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          size="sm"
          variant={activeTab === item.id ? 'secondary' : 'ghost'}
          className="h-full min-w-0 flex-col gap-1 rounded-xl px-1"
          onPress={() => onNavigate(item.id)}
        >
          <Icon name={item.icon} className="size-5 shrink-0" />
          <span className="w-full truncate text-center text-[0.68rem] leading-tight">
            {item.label}
          </span>
        </Button>
      ))}
    </nav>
  );
}
