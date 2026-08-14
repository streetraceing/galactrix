import { Surface } from '@heroui/react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

type AppPanelProps = ComponentProps<typeof Surface> & {
  emphasis?: 'default' | 'subtle';
  interactive?: boolean;
  selected?: boolean;
};

export function AppPanel({
  emphasis = 'default',
  interactive = false,
  selected = false,
  variant,
  className,
  ...props
}: AppPanelProps) {
  return (
    <Surface
      {...props}
      variant={variant ?? (emphasis === 'subtle' ? 'secondary' : 'default')}
      className={cn(
        'app-panel',
        emphasis === 'subtle' ? 'app-panel--subtle' : 'app-panel--default',
        interactive && 'app-panel--interactive',
        selected && 'app-panel--selected',
        className,
      )}
    />
  );
}
