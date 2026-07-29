import { Input, Surface } from '@heroui/react';
import type { ChangeEvent } from 'react';
import type { ProviderInput } from '../../../types';
import { FormField } from './FormField';

export function GenerationSettings({
  form,
  onPatch,
}: {
  form: ProviderInput;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
}) {
  return (
    <Surface className="rounded-2xl border border-separator p-4 bg-surface-secondary/50">
      <strong className="text-sm font-medium">Параметры генерации</strong>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <FormField label="Temperature">
          <Input
            autoComplete="off"
            fullWidth
            variant="secondary"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={String(form.temperature)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch('temperature', Number(event.target.value))
            }
          />
        </FormField>
        <FormField label="Top P">
          <Input
            autoComplete="off"
            fullWidth
            variant="secondary"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={String(form.topP)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch('topP', Number(event.target.value))
            }
          />
        </FormField>
        <FormField label="Max tokens">
          <Input
            autoComplete="off"
            fullWidth
            variant="secondary"
            type="number"
            min="1"
            value={String(form.maxTokens)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch('maxTokens', Number(event.target.value))
            }
          />
        </FormField>
      </div>
    </Surface>
  );
}
