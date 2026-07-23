import { Button, Chip } from '@heroui/react';
import type { CSSProperties } from 'react';
import { navigationItems } from '../../app/navigation';
import type { TabId } from '../../types';
import { BrandMark } from '../BrandMark';
import { Icon } from '../Icon';

export function DesktopSidebar({
  activeTab,
  chatCount,
  appVersion,
  width,
  onNavigate,
}: {
  activeTab: TabId;
  chatCount: number;
  appVersion: string;
  width: number;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <aside
      className="hidden h-full shrink-0 flex-col border-r border-separator bg-surface md:flex"
      style={{ width, minWidth: 196, maxWidth: 420 } as CSSProperties}
    >
      <div className="flex min-h-20 items-center gap-3 px-4 py-4">
        <BrandMark size={40} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">Galactrix</div>
          <div className="mt-1 truncate text-xs text-muted">AI-клиент</div>
        </div>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 px-2"
        aria-label="Основная навигация"
      >
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            size="lg"
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3 px-3"
            onPress={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {item.label}
            </span>
            {item.id === 'chats' && chatCount > 0 ? (
              <Chip size="sm" variant="soft">
                {chatCount}
              </Chip>
            ) : null}
          </Button>
        ))}
      </nav>

      <div className="flex items-center justify-between px-4 py-3 text-[0.7rem] text-muted">
        <span>Galactrix</span>
        <span>{appVersion ? `v${appVersion}` : ''}</span>
      </div>
    </aside>
  );
}
