import type { Provider, ProviderInput, ProviderKind } from '../../types';
import { providerCatalog } from './catalog';

export const providerStatusLabels = {
  connected: 'Доступен',
  disabled: 'Не проверен',
  error: 'Ошибка',
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
