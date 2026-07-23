import { Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { providerCatalog } from '../../../data';
import type { ProviderKind } from '../../../types';

export function ProviderTypePicker({
  onChoose,
}: {
  onChoose: (kind: ProviderKind) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {providerCatalog.map((provider) => (
        <Surface
          key={provider.kind}
          className="overflow-hidden rounded-2xl border border-separator transition-colors hover:bg-surface-tertiary"
        >
          <button
            type="button"
            className="flex h-full w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
            onClick={() => onChoose(provider.kind)}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-xs font-semibold text-accent">
              {provider.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-medium">
                {provider.name}
              </strong>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {provider.description}
              </span>
            </span>
            <Icon name="chevron" className="mt-1 size-4 shrink-0 text-muted" />
          </button>
        </Surface>
      ))}
    </div>
  );
}
