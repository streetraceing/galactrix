import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { CollectionCard } from '../../../components/ui/CollectionCard';
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
        <CollectionCard
          leading={
            hasIdentityAvatar ? (
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
            )
          }
          title={item.name}
          badges={
            <Chip size="sm" variant="soft">
              {t(galaxyKindLabelKeys[item.kind], { ns: 'common' })}
            </Chip>
          }
          description={item.description || t('galaxyCard.noDescriptionYet')}
          details={
            details.length > 0 ? (
              <span className="flex flex-wrap gap-2">
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
            ) : null
          }
          metadata={
            <span className="block sm:text-right">
              <span className="block font-medium text-foreground/80">
                {t('galaxyCard.modified')}
              </span>
              <span className="mt-1 block">{relativeUpdatedAt}</span>
            </span>
          }
          metadataClassName="sm:min-w-44"
          selectionActive={selectionActive}
          selected={selected}
          onPress={selectionActive ? onToggleSelection : onEdit}
        />
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
