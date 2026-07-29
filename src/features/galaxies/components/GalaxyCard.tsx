import { Chip, Surface } from '@heroui/react';
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
import type { GalaxyItem } from '../../../types';
import { galaxyItemAvatar } from '../../../lib/avatar';
import { galaxyKindIcons, galaxyKindLabels } from '../catalog';
import { galaxyItemDetails } from '../summary';
import { formatRelativeTime } from '../../../i18n';
import { useTranslation } from 'react-i18next';

export function GalaxyCard({
  item,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  item: GalaxyItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('galaxies');
  const details = galaxyItemDetails(item);
  const avatar = galaxyItemAvatar(item);
  const hasIdentityAvatar =
    item.kind === 'persona' || item.kind === 'character';

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full">
        <Surface className="interactive-card group h-full overflow-hidden rounded-2xl border border-separator hover:bg-surface-secondary">
          <button
            type="button"
            className="flex h-full w-full gap-3.5 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:p-5"
            onClick={onEdit}
          >
            {hasIdentityAvatar ? (
              <AppAvatar
                src={avatar}
                name={item.name}
                className="size-11"
                square
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon name={galaxyKindIcons[item.kind]} className="size-5" />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-start gap-2">
                <strong className="min-w-0 flex-1 truncate text-base font-semibold">
                  {item.name}
                </strong>
                <Chip size="sm" variant="soft" className="bg-transparent">
                  {galaxyKindLabels[item.kind]}
                </Chip>
              </span>
              <span className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted">
                {item.description || t('galaxyCard.noDescriptionYet')}
              </span>

              {details.length > 0 ? (
                <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </span>
              ) : null}

              <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted">
                <span>
                  {t('galaxyCard.modified')}
                  {formatRelativeTime(item.updatedAt)}
                </span>
                <Icon
                  name="chevron"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </span>
          </button>
        </Surface>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{item.name}</ContextMenuLabel>
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
