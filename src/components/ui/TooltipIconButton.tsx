import { Button } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';
import { AppTooltip } from './AppTooltip';

type ButtonProps = ComponentProps<typeof Button>;
type TooltipPlacement = ComponentProps<typeof AppTooltip>['placement'];
type TooltipTriggerClassName = ComponentProps<
  typeof AppTooltip
>['triggerClassName'];

export type TooltipIconButtonProps = Omit<
  ButtonProps,
  'aria-label' | 'children' | 'isIconOnly'
> & {
  label: string;
  children: ReactNode;
  tooltipPlacement?: TooltipPlacement;
  tooltipDisabled?: boolean;
  tooltipDelay?: number;
  tooltipTriggerClassName?: TooltipTriggerClassName;
};

export function TooltipIconButton({
  label,
  children,
  tooltipPlacement = 'top',
  tooltipDisabled = false,
  tooltipDelay,
  tooltipTriggerClassName,
  ...buttonProps
}: TooltipIconButtonProps) {
  return (
    <AppTooltip
      content={label}
      placement={tooltipPlacement}
      disabled={tooltipDisabled}
      delay={tooltipDelay}
      triggerClassName={tooltipTriggerClassName}
    >
      <Button {...buttonProps} isIconOnly aria-label={label}>
        {children}
      </Button>
    </AppTooltip>
  );
}
