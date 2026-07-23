import { Button, Surface } from '@heroui/react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon';

type EmptyIcon = 'chats' | 'galaxies' | 'telescope' | 'profile';

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: EmptyIcon;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; icon?: ReactNode };
  compact?: boolean;
}) {
  return (
    <Surface
      className={`flex w-full flex-col items-center justify-center rounded-2xl border border-separator text-center ${compact ? 'min-h-52 p-6' : 'min-h-88 p-8'}`}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <Icon name={icon} className="size-6" />
      </span>
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
    </Surface>
  );
}
