import { Button, Input } from '@heroui/react';
import type { ChangeEvent } from 'react';
import type { ProviderInput } from '../../../types';
import type { providerCatalog } from '../catalog';
import { Icon } from '../../../components/Icon';
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
  const apiKeys = token.split('\n');
  const updateApiKey = (index: number, value: string) => {
    const next = [...apiKeys];
    next[index] = value;
    onTokenChange(next.join('\n'));
  };
  const removeApiKey = (index: number) => {
    const next = apiKeys.filter((_, keyIndex) => keyIndex !== index);
    onTokenChange(next.length > 0 ? next.join('\n') : '');
  };
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
        <FormField label={t('providerCredentials.apiKeys')}>
          <div className="space-y-2">
            {apiKeys.map((apiKey, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  fullWidth
                  variant="secondary"
                  type="password"
                  value={apiKey}
                  autoComplete="new-password"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateApiKey(index, event.target.value)
                  }
                  placeholder={
                    index === 0
                      ? form.id
                        ? t('providerCredentials.leaveEmptyToKeepUnchanged')
                        : catalog.requiresApiKey
                          ? t('providerCredentials.canBeAddedLater')
                          : t('providerCredentials.optional')
                      : t('providerCredentials.additionalApiKey')
                  }
                />
                {apiKeys.length > 1 ? (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="size-9 min-w-9 shrink-0 rounded-full"
                    aria-label={t('providerCredentials.removeApiKey')}
                    onPress={() => removeApiKey(index)}
                  >
                    <Icon name="close" className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="w-fit"
              onPress={() => onTokenChange(`${token}\n`)}
            >
              <Icon name="plus" className="size-4" />
              {t('providerCredentials.addApiKey')}
            </Button>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {t('providerCredentials.apiKeysHint')}
          </p>
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
