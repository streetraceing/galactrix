import { Input } from '@heroui/react';
import type { ChangeEvent } from 'react';
import type { ProviderInput } from '../../../types';
import type { providerCatalog } from '../catalog';
import { FormField } from './FormField';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('telescope');
  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('providerCredentials.name')}>
        <Input
          fullWidth
          variant="secondary"
          value={form.name}
          autoComplete="off"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onPatch('name', event.target.value)
          }
        />
      </FormField>
      {form.kind !== 'ollama' ? (
        <FormField label={t('providerCredentials.apiKey')}>
          <Input
            fullWidth
            variant="secondary"
            type="password"
            value={token}
            autoComplete="new-password"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTokenChange(event.target.value)
            }
            placeholder={
              form.id
                ? t('providerCredentials.leaveEmptyToKeepUnchanged')
                : catalog.requiresApiKey
                  ? t('providerCredentials.canBeAddedLater')
                  : t('providerCredentials.optional')
            }
          />
        </FormField>
      ) : null}
      {form.kind === 'custom' ||
      form.kind === 'ollama' ||
      form.kind === 'ollama-cloud' ? (
        <div className="sm:col-span-2">
          <FormField label="Base URL">
            <Input
              fullWidth
              variant="secondary"
              value={form.baseUrl ?? ''}
              autoComplete="off"
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
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPatch('accountId', event.target.value)
              }
            />
          </FormField>
        </div>
      ) : null}
      {form.kind === 'ollama' ? (
        <p className="text-xs leading-5 text-muted">
          {t('providerCredentials.onAndroidUseTheComputerSLanAddressForOllama')}
        </p>
      ) : null}
    </div>
  );
}
