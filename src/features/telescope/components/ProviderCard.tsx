import { Button, ButtonGroup, Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type { Provider } from '../../../types';
import { providerStatusLabels } from '../providerHelpers';

export function ProviderCard({
  provider,
  checking,
  onCheck,
  onEdit,
}: {
  provider: Provider;
  checking: boolean;
  onCheck: () => void;
  onEdit: () => void;
}) {
  return (
    <Surface className="flex min-w-0 items-center gap-3 rounded-2xl border border-separator p-4 transition-colors hover:bg-surface-secondary">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-xs font-semibold text-accent">
        {provider.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
            {provider.name}
          </h3>
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
            {providerStatusLabels[provider.status]}
          </Chip>
        </div>
        <p className="mt-1 truncate text-sm text-muted">
          {provider.model || 'Модель не выбрана'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{provider.hasSecret ? 'Ключ сохранён' : 'Без ключа'}</span>
          <span>
            {provider.latencyMs != null
              ? `${provider.latencyMs} мс`
              : 'Не проверено'}
          </span>
        </div>
      </div>
      <ButtonGroup size="sm" variant="ghost" className="shrink-0">
        <Button
          isIconOnly
          isPending={checking}
          aria-label="Проверить подключение"
          onPress={onCheck}
        >
          <Icon name="refresh" className="size-4" />
        </Button>
        <Button
          isIconOnly
          aria-label="Редактировать подключение"
          onPress={onEdit}
        >
          <Icon name="settings" className="size-4" />
        </Button>
      </ButtonGroup>
    </Surface>
  );
}
