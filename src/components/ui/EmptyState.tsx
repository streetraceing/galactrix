import { Button } from '@heroui/react';
import type { ReactNode } from 'react';
import type { IconName } from '../Icon';
import { cn } from '../../lib/cn';
import { AppPanel } from './AppPanel';
import { AppIconTile } from './AppIconTile';

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; icon?: ReactNode };
  compact?: boolean;
}) {
  return (
    <AppPanel
      className={cn(
        'motion-empty-enter flex w-full flex-col items-center justify-center text-center',
        compact ? 'min-h-52 p-6' : 'min-h-88 p-8',
      )}
    >
      <AppIconTile icon={icon} size="lg" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-muted">
        {description}
      </p>
      {action ? (
        <Button className="mt-5" variant="primary" onPress={action.onPress}>
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </AppPanel>
  );
}
