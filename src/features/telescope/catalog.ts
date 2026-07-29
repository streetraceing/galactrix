import type { ProviderKind } from '../../types';

export const providerCatalog: Array<{
  kind: ProviderKind;
  name: string;
  description: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
  requiresAccountId?: boolean;
  requiresApiKey: boolean;
  supportsAutomaticModels: boolean;
  available?: boolean;
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
    kind: 'google-gemini',
    name: 'Google Gemini',
    description: 'Gemini API через OpenAI-совместимый endpoint',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'groq',
    name: 'Groq',
    description: 'Высокоскоростной OpenAI-совместимый API',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'openrouter',
    name: 'OpenRouter',
    description: 'Модели разных провайдеров и автоматический роутер',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'huggingface',
    name: 'Hugging Face',
    description: 'Inference Providers через единый OpenAI-совместимый Router',
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'ollama',
    name: 'Ollama Local',
    description: 'Локальные модели без API-ключа',
    defaultBaseUrl: 'http://localhost:11434/api',
    requiresApiKey: false,
    supportsAutomaticModels: true,
  },
  {
    kind: 'ollama-cloud',
    name: 'Ollama Cloud',
    description: 'Облачные модели Ollama с Bearer API-ключом',
    defaultBaseUrl: 'https://ollama.com/api',
    requiresApiKey: true,
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
    description: 'Поддержка появится после отдельного адаптера авторизации',
    requiresApiKey: true,
    supportsAutomaticModels: false,
    available: false,
  },
];
