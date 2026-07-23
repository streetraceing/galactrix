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
      className="shrink-0 border-t border-separator bg-surface px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="grid h-16 w-full grid-cols-4 gap-1">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              fullWidth
              size="sm"
              variant={isActive ? 'secondary' : 'ghost'}
              className="h-full min-w-0 flex-col justify-center gap-1 rounded-xl px-1 data-[pressed=true]:scale-100"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onPress={() => onNavigate(item.id)}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span className="block w-full truncate text-center text-[0.7rem] font-medium leading-none">
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
