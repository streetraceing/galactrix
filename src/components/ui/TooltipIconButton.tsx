import { Button } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';
import { AppTooltip } from './AppTooltip';

type ButtonProps = ComponentProps<typeof Button>;
type TooltipPlacement = ComponentProps<typeof AppTooltip>['placement'];

export type TooltipIconButtonProps = Omit<
  ButtonProps,
  'aria-label' | 'children' | 'isIconOnly'
> & {
  label: string;
  children: ReactNode;
  tooltipPlacement?: TooltipPlacement;
  tooltipDisabled?: boolean;
  tooltipDelay?: number;
};

export function TooltipIconButton({
  label,
  children,
  tooltipPlacement = 'top',
  tooltipDisabled = false,
  tooltipDelay,
  ...buttonProps
}: TooltipIconButtonProps) {
  return (
    <AppTooltip
      content={label}
      placement={tooltipPlacement}
      disabled={tooltipDisabled}
      delay={tooltipDelay}
    >
      <Button {...buttonProps} isIconOnly aria-label={label}>
        {children}
      </Button>
    </AppTooltip>
  );
}
