import { Input } from '@heroui/react';
import type { ChangeEvent } from 'react';
import type { ProviderInput } from '../../../types';
import type { providerCatalog } from '../../../data';
import { FormField } from './FormField';

type CatalogEntry = (typeof providerCatalog)[number];

export function ProviderCredentials({
  form,
  token,
  catalog,
  onPatch,
  onTokenChange,
}: {
  form: ProviderInput;
  token: string;
  catalog: CatalogEntry;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
  onTokenChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FormField label="Название">
        <Input
          fullWidth
          variant="secondary"
          value={form.name}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onPatch('name', event.target.value)
          }
        />
      </FormField>
      <FormField label="API-ключ">
        <Input
          fullWidth
          variant="secondary"
          type="password"
          value={token}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onTokenChange(event.target.value)
          }
          placeholder={
            form.id
              ? 'Оставьте пустым, чтобы не менять'
              : catalog.requiresApiKey
                ? 'Обязателен'
                : 'Необязательно'
          }
        />
      </FormField>
      {form.kind === 'custom' || form.kind === 'ollama-cloud' ? (
        <div className="sm:col-span-2">
          <FormField label="Base URL">
            <Input
              fullWidth
              variant="secondary"
              value={form.baseUrl ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPatch('baseUrl', event.target.value)
              }
              placeholder="https://host.example/v1"
            />
          </FormField>
        </div>
      ) : null}
      {catalog.requiresAccountId ? (
        <div className="sm:col-span-2">
          <FormField label="Cloudflare Account ID">
            <Input
              fullWidth
              variant="secondary"
              value={form.accountId ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPatch('accountId', event.target.value)
              }
            />
          </FormField>
        </div>
      ) : null}
    </div>
  );
}
