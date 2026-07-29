import { Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { ProviderLogo } from '../../../components/ui/ProviderLogo';
import type { ProviderKind } from '../../../types';
import { providerCatalog } from '../catalog';

export function ProviderTypePicker({
  onChoose,
}: {
  onChoose: (kind: ProviderKind) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {providerCatalog
        .filter((provider) => provider.available !== false)
        .map((provider) => (
          <Surface
            key={provider.kind}
            className="interactive-card overflow-hidden rounded-2xl border border-separator bg-surface-secondary/50 hover:bg-surface-secondary"
          >
            <button
              type="button"
              className="flex h-full w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
              onClick={() => onChoose(provider.kind)}
            >
              <ProviderLogo
                kind={provider.kind}
                name={provider.name}
                className="size-10"
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-medium">
                  {provider.name}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {provider.description}
                </span>
              </span>
              <Icon
                name="chevron"
                className="mt-1 size-4 shrink-0 text-muted"
              />
            </button>
          </Surface>
        ))}
    </div>
  );
}
