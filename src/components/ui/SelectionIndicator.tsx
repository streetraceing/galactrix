import { Icon } from '../Icon';
import { cn } from '../../lib/cn';

export function SelectionIndicator({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'selection-indicator motion-status-enter',
        selected && 'selection-indicator--selected',
        className,
      )}
      aria-hidden="true"
    >
      <Icon name="check" className="size-3" />
    </span>
  );
}
