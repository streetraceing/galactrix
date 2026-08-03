import { Button, Input, Surface, Switch } from '@heroui/react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import type { EmbeddingProbeResult, ProviderInput } from '../../../types';
import { FormField } from './FormField';

function defaultEmbeddingModel(kind: ProviderInput['kind']) {
  if (kind === 'ollama' || kind === 'ollama-cloud') return 'qwen3-embedding';
  if (kind === 'mistral') return 'mistral-embed';
  return '';
}

export function ProviderEmbeddingSection({
  form,
  testing,
  probe,
  onPatch,
  onTest,
}: {
  form: ProviderInput;
  testing: boolean;
  probe: EmbeddingProbeResult | null;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
  onTest: () => void;
}) {
  const { t } = useTranslation('telescope');
  const enabled = form.embeddingModel != null;

  return (
    <Surface className="rounded-2xl border border-separator bg-surface-secondary/50 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon name="brain" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm font-medium">
            {t('providerEmbeddingSection.title')}
          </strong>
          <p className="mt-1 text-xs leading-5 text-muted">
            {t('providerEmbeddingSection.description')}
          </p>
        </div>
        <Switch
          className="shrink-0"
          isSelected={enabled}
          onChange={(selected) => {
            onPatch(
              'embeddingModel',
              selected ? defaultEmbeddingModel(form.kind) : undefined,
            );
            if (!selected) onPatch('embeddingBaseUrl', undefined);
          }}
          aria-label={t('providerEmbeddingSection.title')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4 border-t border-separator pt-4">
          <FormField label={t('providerEmbeddingSection.model')}>
            <Input
              autoComplete="off"
              fullWidth
              variant="secondary"
              value={form.embeddingModel ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPatch('embeddingModel', event.target.value)
              }
              placeholder={t('providerEmbeddingSection.modelPlaceholder')}
            />
          </FormField>
          <FormField label={t('providerEmbeddingSection.baseUrl')}>
            <Input
              autoComplete="off"
              fullWidth
              variant="secondary"
              value={form.embeddingBaseUrl ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPatch('embeddingBaseUrl', event.target.value || undefined)
              }
              placeholder={t('providerEmbeddingSection.baseUrlPlaceholder')}
            />
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {t('providerEmbeddingSection.baseUrlHint')}
            </p>
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              isPending={testing}
              isDisabled={!form.embeddingModel?.trim()}
              onPress={onTest}
            >
              <Icon name="refresh" className="size-4" />
              {t('providerEmbeddingSection.test')}
            </Button>
            {probe ? (
              <p className="text-xs text-success">
                {t('providerEmbeddingSection.testSuccess', {
                  dimensions: probe.dimensions,
                  latency: probe.latencyMs,
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}
