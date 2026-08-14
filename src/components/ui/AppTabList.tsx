import { Tabs } from '@heroui/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../Icon';

export type AppTabItem = {
  id: string;
  label: ReactNode;
  icon?: IconName;
  accessory?: ReactNode;
};

export function AppTabList({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly AppTabItem[];
  className?: string;
}) {
  return (
    <Tabs.ListContainer className="app-tabs__list-container">
      <Tabs.List aria-label={label} className={cn('app-tabs__list', className)}>
        {items.map((item) => (
          <Tabs.Tab key={item.id} id={item.id}>
            {item.icon ? (
              <Icon name={item.icon} className="size-4 shrink-0" />
            ) : null}
            <span className="truncate">{item.label}</span>
            {item.accessory}
            <Tabs.Indicator />
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.ListContainer>
  );
}
