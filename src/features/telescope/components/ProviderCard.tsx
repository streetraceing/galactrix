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
import { providerCatalog } from '../catalog';
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
  const catalog = providerCatalog.find((entry) => entry.kind === provider.kind);
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <Surface
          className="interactive-card group overflow-hidden rounded-2xl border border-separator hover:bg-surface-secondary"
          aria-busy={checking}
        >
          <button
            type="button"
            className="flex w-full min-w-0 flex-col gap-4 p-4 text-left outline-none sm:flex-row sm:items-start sm:gap-5 sm:p-5"
            onClick={onEdit}
          >
            <span className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
              <ProviderLogo kind={provider.kind} name={provider.name} />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <strong className="min-w-0 text-base font-semibold sm:text-lg">
                    {provider.name}
                  </strong>
                  <Chip
                    size="sm"
                    variant="soft"
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

                <span className="mt-1 block text-sm leading-6 text-muted">
                  {catalog?.description ?? provider.kind}
                </span>

                <span className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
              </span>
            </span>

            <span className="flex shrink-0 items-center justify-between gap-4 border-t border-separator pt-3 text-xs text-muted sm:min-w-48 sm:justify-end sm:border-l sm:border-t-0 sm:py-1 sm:pl-5 sm:pt-0">
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
              <Icon
                name="chevron"
                className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              />
            </span>
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
