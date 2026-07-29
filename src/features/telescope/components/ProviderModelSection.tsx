import { Button, Input, Label, ListBox, Select, Surface } from '@heroui/react';
import type { ChangeEvent, Key } from 'react';
import { Icon } from '../../../components/Icon';
import type { ProviderInput } from '../../../types';
import { FormField } from './FormField';
import { useTranslation } from 'react-i18next';

export function ProviderModelSection({
  form,
  models,
  latency,
  loading,
  onPatch,
  onLoadModels,
}: {
  form: ProviderInput;
  models: string[];
  latency: number | null;
  loading: boolean;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
  onLoadModels: () => void;
}) {
  const { t } = useTranslation('telescope');
  return (
    <Surface className="rounded-2xl border border-separator p-4 bg-surface-secondary/50 ">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <strong className="text-sm font-medium">
            {t('providerModelSection.model')}
          </strong>
          <p className="mt-1 text-xs text-muted">
            {latency != null
              ? t('providerModelSection.apiLatency', { value1: latency })
              : t('providerModelSection.theListHasNotBeenLoadedYet')}
          </p>
        </div>
        <Button variant="secondary" isPending={loading} onPress={onLoadModels}>
          <Icon name="refresh" className="size-4" />{' '}
          {t('providerModelSection.loadModels')}
        </Button>
      </div>

      {models.length > 0 ? (
        <Select
          className="mt-4"
          fullWidth
          variant="secondary"
          value={models.includes(form.model) ? form.model : null}
          onChange={(value: Key | Key[] | null) =>
            onPatch('model', String(value ?? ''))
          }
          placeholder={t('providerModelSection.selectAModel')}
          aria-label={t('providerModelSection.availableModels')}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {models.map((model) => (
                <ListBox.Item id={model} key={model} textValue={model}>
                  <Label>{model}</Label>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : null}

      <div className="mt-4">
        <FormField label={t('providerModelSection.modelId')}>
          <Input
            autoComplete="off"
            fullWidth
            variant="secondary"
            value={form.model}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch('model', event.target.value)
            }
            placeholder={t('providerModelSection.canBeEnteredManually')}
          />
        </FormField>
      </div>
    </Surface>
  );
}
