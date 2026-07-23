import { Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type { GalaxyItem } from '../../../types';
import { galaxyKindIcons, galaxyKindLabels } from '../catalog';

export function GalaxyCard({
  item,
  onPress,
}: {
  item: GalaxyItem;
  onPress: () => void;
}) {
  return (
    <Surface className="group overflow-hidden rounded-2xl border border-separator transition-colors hover:bg-surface-tertiary">
      <button
        type="button"
        className="flex h-full w-full gap-4 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        onClick={onPress}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Icon name={galaxyKindIcons[item.kind]} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-start gap-2">
            <strong className="min-w-0 flex-1 truncate text-base font-semibold">
              {item.name}
            </strong>
            <Chip size="sm" variant="soft">
              {galaxyKindLabels[item.kind]}
            </Chip>
          </span>
          <span className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
            {item.description || 'Описание пока не добавлено.'}
          </span>
          <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted">
            <span>Изменено {item.updatedAt}</span>
            <Icon
              name="chevron"
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </button>
    </Surface>
  );
}
