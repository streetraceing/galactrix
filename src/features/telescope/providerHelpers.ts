import type { Provider, ProviderInput, ProviderKind } from '../../types';
import { i18next } from '../../i18n';
import { providerCatalog } from './catalog';

export const providerStatusLabels = {
  get connected() {
    return i18next.t('status.connected', { ns: 'telescope' });
  },
  get disabled() {
    return i18next.t('status.disabled', { ns: 'telescope' });
  },
  get error() {
    return i18next.t('status.error', { ns: 'telescope' });
  },
} as const;

export function defaultProviderInput(kind: ProviderKind): ProviderInput {
  const catalog = providerCatalog.find((entry) => entry.kind === kind)!;
  return {
    name: catalog.name,
    kind,
    model: catalog.defaultModel ?? '',
    baseUrl: catalog.defaultBaseUrl,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 4096,
  };
}

export function providerToInput(provider: Provider): ProviderInput {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    model: provider.model,
    baseUrl: provider.baseUrl,
    accountId: provider.accountId,
    temperature: provider.temperature,
    topP: provider.topP,
    maxTokens: provider.maxTokens,
  };
}
