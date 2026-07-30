import { Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
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
import { providerStatusLabels } from '../providerHelpers';
import { useTranslation } from 'react-i18next';

export function ProviderCard({
  provider,
  checking,
  onCheck,
  onEdit,
  onDelete,
}: {
  provider: Provider;
  checking: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('telescope');
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full">
        <Surface
          className="interactive-card group h-full overflow-hidden rounded-2xl border border-separator hover:bg-surface-secondary"
          aria-busy={checking}
        >
          <button
            type="button"
            className="flex h-full w-full min-w-0 items-center gap-3 p-4 text-left outline-none sm:p-5"
            onClick={onEdit}
          >
            <ProviderLogo kind={provider.kind} name={provider.name} />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <strong className="min-w-0 flex-1 truncate text-base font-semibold">
                  {provider.name}
                </strong>
                <Chip
                  size="sm"
                  variant="soft"
                  className="bg-transparent"
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
              </span>
              <span className="mt-1 block truncate text-sm text-muted">
                {provider.model || t('providerCard.noModelSelected')}
              </span>
              <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>
                  {provider.hasSecret
                    ? t('providerCard.keySaved')
                    : t('providerCard.noKey')}
                </span>
                <span>
                  {provider.latencyMs != null
                    ? t('providerCard.latency', { value1: provider.latencyMs })
                    : t('providerCard.notChecked')}
                </span>
              </span>
            </span>
            <Icon
              name="chevron"
              className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </Surface>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{provider.name}</ContextMenuLabel>
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
