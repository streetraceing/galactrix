import { Chip, Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { useRelativeTime } from '../../../i18n/useRelativeTime';
import { galaxyItemAvatar } from '../../../lib/avatar';
import type { GalaxyItem } from '../../../types';
import { galaxyKindIcons, galaxyKindLabelKeys } from '../catalog';
import { galaxyItemDetails } from '../summary';

export function GalaxyCard({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  selectionActive,
  selected,
  onToggleSelection,
  onStartSelection,
}: {
  item: GalaxyItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  selectionActive: boolean;
  selected: boolean;
  onToggleSelection: () => void;
  onStartSelection: () => void;
}) {
  const { t } = useTranslation(['galaxies', 'common']);
  const relativeUpdatedAt = useRelativeTime(item.updatedAt);
  const details = galaxyItemDetails(item);
  const avatar = galaxyItemAvatar(item);
  const hasIdentityAvatar =
    item.kind === 'persona' || item.kind === 'character';

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <Surface
          className={`interactive-card group overflow-hidden rounded-2xl border ${
            selected
              ? 'border-accent/55 bg-accent/8 ring-1 ring-inset ring-accent/25'
              : 'border-separator hover:bg-surface-secondary'
          }`}
        >
          <button
            type="button"
            className="flex w-full min-w-0 flex-col gap-4 p-4 text-left outline-none sm:flex-row sm:items-start sm:gap-5 sm:p-5"
            aria-pressed={selectionActive ? selected : undefined}
            onClick={selectionActive ? onToggleSelection : onEdit}
          >
            <span className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
              {selectionActive ? (
                <span
                  className={`motion-status-enter grid size-5 shrink-0 place-items-center rounded-full border transition-[color,background-color,border-color,transform] duration-(--motion-fast) ease-(--motion-ease) ${
                    selected
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-separator text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Icon name="check" className="size-3" />
                </span>
              ) : null}
              {hasIdentityAvatar ? (
                <AppAvatar
                  src={avatar}
                  name={item.name}
                  className="size-12 shrink-0 sm:size-14"
                  square
                />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent sm:size-14">
                  <Icon
                    name={galaxyKindIcons[item.kind]}
                    className="size-5 sm:size-6"
                  />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <strong className="min-w-0 text-base font-semibold sm:text-lg">
                    {item.name}
                  </strong>
                  <Chip size="sm" variant="soft">
                    {t(galaxyKindLabelKeys[item.kind], { ns: 'common' })}
                  </Chip>
                </span>

                <span className="mt-1.5 block max-w-4xl text-sm leading-6 text-muted">
                  {item.description || t('galaxyCard.noDescriptionYet')}
                </span>

                {details.length > 0 ? (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {details.map((detail) => (
                      <Chip
                        key={detail}
                        size="sm"
                        variant="soft"
                        className="bg-default/55"
                      >
                        {detail}
                      </Chip>
                    ))}
                  </span>
                ) : null}
              </span>
            </span>

            <span className="flex shrink-0 items-center justify-between gap-4 border-t border-separator pt-3 text-xs text-muted sm:min-w-44 sm:justify-end sm:border-l sm:border-t-0 sm:py-1 sm:pl-5 sm:pt-0">
              <span className="sm:text-right">
                <span className="block font-medium text-foreground/80">
                  {t('galaxyCard.modified')}
                </span>
                <span className="mt-1 block">{relativeUpdatedAt}</span>
              </span>
              <Icon
                name="chevron"
                className="size-4 shrink-0 transition-transform duration-(--motion-fast) ease-(--motion-ease) group-hover:translate-x-0.5"
              />
            </span>
          </button>
        </Surface>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{item.name}</ContextMenuLabel>
        <ContextMenuItem
          onClick={selected ? onToggleSelection : onStartSelection}
        >
          <Icon name="check" className="size-4 text-accent" />
          {selected ? t('selection.remove') : t('selection.select')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onEdit}>
          <Icon name="edit" className="size-4" /> {t('galaxyCard.edit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate}>
          <Icon name="copy" className="size-4" /> {t('galaxyCard.createACopy')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Icon name="trash" className="size-4" /> {t('galaxyCard.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
