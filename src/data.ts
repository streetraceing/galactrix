import type { ProviderKind } from './types';

export const providerCatalog: Array<{
  kind: ProviderKind;
  name: string;
  description: string;
  defaultBaseUrl?: string;
  requiresAccountId?: boolean;
  requiresApiKey: boolean;
  supportsAutomaticModels: boolean;
}> = [
  {
    kind: 'mistral',
    name: 'Mistral',
    description: 'Mistral API',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'cerebras',
    name: 'Cerebras',
    description: 'Cerebras Inference API',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'nvidia-nim',
    name: 'NVIDIA NIM',
    description: 'NVIDIA API Catalog / NIM',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'ollama-cloud',
    name: 'Ollama',
    description: 'Локальный Ollama или Ollama Cloud',
    defaultBaseUrl: 'http://localhost:11434/api',
    requiresApiKey: false,
    supportsAutomaticModels: true,
  },
  {
    kind: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    description: 'Workers AI REST API',
    requiresAccountId: true,
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'custom',
    name: 'OpenAI-compatible',
    description: 'Совместимый endpoint с /models и /chat/completions',
    requiresApiKey: false,
    supportsAutomaticModels: true,
  },
  {
    kind: 'character-ai',
    name: 'Character.AI',
    description: 'Нужен отдельный адаптер авторизации',
    requiresApiKey: true,
    supportsAutomaticModels: false,
  },
];
