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
}: {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  disabled?: boolean;
  delay?: number;
  allowTouch?: boolean;
}) {
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  return (
    <Tooltip
      delay={delay}
      closeDelay={75}
      isDisabled={disabled || (!allowTouch && !canHover)}
    >
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
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
