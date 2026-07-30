import { Tooltip } from '@heroui/react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

type TooltipPlacement = ComponentProps<typeof Tooltip.Content>['placement'];

export function AppTooltip({
  content,
  children,
  placement = 'top',
  disabled = false,
  delay = 500,
  allowTouch = false,
  triggerClassName,
}: {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  disabled?: boolean;
  delay?: number;
  allowTouch?: boolean;
  triggerClassName?: string;
}) {
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const isDisabled = disabled || (!allowTouch && !canHover);

  return (
    <Tooltip isDisabled={isDisabled} delay={delay} closeDelay={75}>
      <Tooltip.Trigger className={triggerClassName}>{children}</Tooltip.Trigger>
      <Tooltip.Content
        placement={placement}
        showArrow
        className="ui-overlay-surface max-w-64 px-2.5 py-1.5 text-xs font-medium"
      >
        <Tooltip.Arrow />
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}
