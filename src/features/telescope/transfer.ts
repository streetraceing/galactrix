import type { Provider, ProviderImportInput, ProviderKind } from '../../types';
import { i18next } from '../../i18n';
import { providerToInput } from './providerHelpers';

const PROVIDER_KINDS: ProviderKind[] = [
  'mistral',
  'character-ai',
  'cerebras',
  'nvidia-nim',
  'google-gemini',
  'groq',
  'openrouter',
  'huggingface',
  'ollama',
  'ollama-cloud',
  'cloudflare-workers-ai',
  'custom',
];

export type TelescopeImportEntry = ProviderImportInput;

export type TelescopeExport = {
  format: 'galactrix.telescope';
  version: 1;
  exportedAt: string;
  includesSecrets: boolean;
  providers: TelescopeImportEntry[];
};

export function createTelescopeExport(
  providers: Provider[],
  secrets: Record<string, string>,
): TelescopeExport {
  return {
    format: 'galactrix.telescope',
    version: 1,
    exportedAt: new Date().toISOString(),
    includesSecrets: Object.keys(secrets).length > 0,
    providers: providers.map((provider) => ({
      provider: providerToInput(provider),
      apiKey: secrets[provider.id],
    })),
  };
}

export function parseTelescopeExport(value: unknown): TelescopeImportEntry[] {
  const bundle = objectValue(value);
  if (
    bundle.format !== 'galactrix.telescope' ||
    bundle.version !== 1 ||
    !Array.isArray(bundle.providers)
  ) {
    throw new Error(
      i18next.t('errors.notTelescopeExport', { ns: 'telescope' }),
    );
  }

  return bundle.providers.map((raw, index) => {
    const entry = objectValue(raw);
    const provider = objectValue(entry.provider);
    const kind = stringValue(provider.kind) as ProviderKind;
    const name = stringValue(provider.name).trim();
    const model = stringValue(provider.model).trim();
    if (!PROVIDER_KINDS.includes(kind) || !name || !model) {
      throw new Error(
        i18next.t('errors.invalidExportProvider', {
          ns: 'telescope',
          row: index + 1,
        }),
      );
    }
    return {
      provider: {
        id: stringValue(provider.id) || undefined,
        name,
        kind,
        model,
        baseUrl: optionalString(provider.baseUrl),
        accountId: optionalString(provider.accountId),
        embeddingModel: optionalString(provider.embeddingModel),
        embeddingBaseUrl: optionalString(provider.embeddingBaseUrl),
        temperature: finiteNumber(provider.temperature, 0.7),
        topP: finiteNumber(provider.topP, 0.95),
        maxTokens: Math.round(finiteNumber(provider.maxTokens, 4096)),
      },
      apiKey: optionalString(entry.apiKey),
    };
  });
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown) {
  return stringValue(value).trim() || undefined;
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
