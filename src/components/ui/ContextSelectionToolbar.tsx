import { Button, Surface, Tooltip } from '@heroui/react';
import { Icon, type IconName } from '../Icon';

export type ContextSelectionAction = {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function ContextSelectionToolbar({
  count,
  total,
  selectedLabel,
  clearLabel,
  selectAllLabel,
  onClear,
  onSelectAll,
  actions,
  className = '',
}: {
  count: number;
  total: number;
  selectedLabel: string;
  clearLabel: string;
  selectAllLabel: string;
  onClear: () => void;
  onSelectAll: () => void;
  actions: ContextSelectionAction[];
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <div
      data-context-selection-toolbar
      className={`motion-floating-enter z-40 flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 ${className}`}
    >
      <Surface className="flex min-h-12 min-w-0 max-w-full items-center gap-2 rounded-3xl bg-overlay/95 pl-4 pr-1 shadow-overlay backdrop-blur-xl">
        <Icon name="check" className="size-4 text-accent" />
        <span
          className="min-w-0 wrap-anywhere py-2 text-sm font-medium"
          role="status"
          aria-live="polite"
        >
          {selectedLabel}
        </span>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="size-10 min-w-10 rounded-full"
          aria-label={clearLabel}
          onPress={onClear}
        >
          <Icon name="close" className="size-4" />
        </Button>
      </Surface>

      <Surface className="flex min-h-12 min-w-0 max-w-full flex-wrap justify-center items-center gap-0.5 rounded-3xl bg-overlay/95 p-1 shadow-overlay backdrop-blur-xl">
        <Tooltip>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="size-10 min-w-10 rounded-full"
              aria-label={selectAllLabel}
              isDisabled={count === total}
              onPress={onSelectAll}
            >
              <Icon name="check" className="size-4" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{selectAllLabel}</Tooltip.Content>
        </Tooltip>
        {actions.map((action) => (
          <Tooltip key={action.key}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant={action.danger ? 'danger' : 'ghost'}
                className={`size-10 min-w-10 rounded-full ${
                  action.danger ? '' : 'text-foreground'
                }`}
                aria-label={action.label}
                isDisabled={action.disabled}
                onPress={action.onPress}
              >
                <Icon name={action.icon} className="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{action.label}</Tooltip.Content>
          </Tooltip>
        ))}
      </Surface>
    </div>
  );
}
