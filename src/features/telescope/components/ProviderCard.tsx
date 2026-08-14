import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { CollectionCard } from '../../../components/ui/CollectionCard';
import { ProviderLogo } from '../../../components/ui/ProviderLogo';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import type { Provider } from '../../../types';
import { providerCatalog } from '../catalog';
import { providerStatusLabels } from '../providerHelpers';

export function ProviderCard({
  provider,
  checking,
  onCheck,
  onEdit,
  onDelete,
  selectionActive,
  selected,
  onToggleSelection,
  onStartSelection,
}: {
  provider: Provider;
  checking: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectionActive: boolean;
  selected: boolean;
  onToggleSelection: () => void;
  onStartSelection: () => void;
}) {
  const { t } = useTranslation('telescope');
  const catalog = providerCatalog.find((entry) => entry.kind === provider.kind);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <CollectionCard
          className="collection-item-enter"
          leading={<ProviderLogo kind={provider.kind} name={provider.name} />}
          title={provider.name}
          badges={
            <Chip
              key={`${provider.status}:${checking}`}
              size="sm"
              variant="soft"
              className="motion-status-enter"
              color={
                provider.status === 'connected'
                  ? 'success'
                  : provider.status === 'error'
                    ? 'danger'
                    : 'default'
              }
            >
              {checking
                ? t('providerCard.checking')
                : providerStatusLabels[provider.status]}
            </Chip>
          }
          description={catalog?.description ?? provider.kind}
          details={
            <span className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <ProviderFact
                label={t('providerCard.model')}
                value={provider.model || t('providerCard.noModelSelected')}
              />
              <ProviderFact
                label={t('providerCard.maxOutput')}
                value={t('providerCard.tokens', {
                  count: provider.maxTokens,
                })}
              />
              <ProviderFact
                label={t('providerCard.sampling')}
                value={`T ${provider.temperature} · P ${provider.topP}`}
              />
              <ProviderFact
                label={t('providerCard.embedding')}
                value={
                  provider.embeddingModel || t('providerCard.notConfigured')
                }
              />
            </span>
          }
          metadata={
            <span className="flex flex-col gap-1.5 sm:items-end">
              <span className="flex items-center gap-1.5">
                <Icon name="key" className="size-3.5" />
                {provider.hasSecret
                  ? t('providerCard.keySaved')
                  : t('providerCard.noKey')}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="refresh" className="size-3.5" />
                {provider.latencyMs != null
                  ? t('providerCard.latency', { value1: provider.latencyMs })
                  : t('providerCard.notChecked')}
              </span>
            </span>
          }
          metadataClassName="sm:min-w-48"
          selectionActive={selectionActive}
          selected={selected}
          onPress={selectionActive ? onToggleSelection : onEdit}
          busy={checking}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{provider.name}</ContextMenuLabel>
        <ContextMenuItem
          onClick={selected ? onToggleSelection : onStartSelection}
        >
          <Icon name="check" className="size-4 text-accent" />
          {selected ? t('selection.remove') : t('selection.select')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCheck}>
          <Icon name="refresh" className="size-4" />{' '}
          {t('providerCard.checkApi')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onEdit}>
          <Icon name="settings" className="size-4" />{' '}
          {t('providerCard.configure')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Icon name="trash" className="size-4" /> {t('providerCard.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ProviderFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded-xl bg-default/45 px-3 py-2">
      <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-1 block truncate text-xs font-medium text-foreground">
        {value}
      </span>
    </span>
  );
}
