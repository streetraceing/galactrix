import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { cn } from '../../lib/cn';
import { AppPanel } from './AppPanel';
import { SelectionIndicator } from './SelectionIndicator';

export function CollectionCard({
  leading,
  title,
  badges,
  description,
  details,
  metadata,
  selectionActive,
  selected,
  onPress,
  busy = false,
  className,
  metadataClassName,
}: {
  leading: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  description?: ReactNode;
  details?: ReactNode;
  metadata?: ReactNode;
  selectionActive: boolean;
  selected: boolean;
  onPress: () => void;
  busy?: boolean;
  className?: string;
  metadataClassName?: string;
}) {
  return (
    <AppPanel
      interactive
      selected={selected}
      className={cn('collection-card group overflow-hidden', className)}
      aria-busy={busy || undefined}
    >
      <button
        type="button"
        className="collection-card__button"
        aria-pressed={selectionActive ? selected : undefined}
        onClick={onPress}
      >
        <span className="collection-card__content">
          {selectionActive ? <SelectionIndicator selected={selected} /> : null}
          {leading}
          <span className="collection-card__copy">
            <span className="collection-card__heading">
              <strong className="collection-card__title">{title}</strong>
              {badges}
            </span>
            {description ? (
              <span className="collection-card__description">
                {description}
              </span>
            ) : null}
            {details ? (
              <span className="collection-card__details">{details}</span>
            ) : null}
          </span>
        </span>

        {metadata ? (
          <span className={cn('collection-card__metadata', metadataClassName)}>
            <span className="min-w-0 flex-1 sm:flex-none">{metadata}</span>
            <Icon name="chevron" className="collection-card__chevron" />
          </span>
        ) : null}
      </button>
    </AppPanel>
  );
}
