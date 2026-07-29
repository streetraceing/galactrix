import type { ProviderKind } from '../../types';
import { translate, type TranslationKey } from '../../i18n';

function providerText(key: TranslationKey<'telescope'>) {
  return translate('telescope', key);
}

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
    get description() {
      return providerText('provider.gemini.description');
    },
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'groq',
    name: 'Groq',
    get description() {
      return providerText('provider.groq.description');
    },
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'openrouter',
    name: 'OpenRouter',
    get description() {
      return providerText('provider.openrouter.description');
    },
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'huggingface',
    name: 'Hugging Face',
    get description() {
      return providerText('provider.huggingface.description');
    },
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    requiresApiKey: true,
    supportsAutomaticModels: true,
  },
  {
    kind: 'ollama',
    name: 'Ollama Local',
    get description() {
      return providerText('provider.ollama.description');
    },
    defaultBaseUrl: 'http://localhost:11434/api',
    requiresApiKey: false,
    supportsAutomaticModels: true,
  },
  {
    kind: 'ollama-cloud',
    name: 'Ollama Cloud',
    get description() {
      return providerText('provider.ollamaCloud.description');
    },
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
    get description() {
      return providerText('provider.custom.description');
    },
    requiresApiKey: false,
    supportsAutomaticModels: true,
  },
  {
    kind: 'character-ai',
    name: 'Character.AI',
    get description() {
      return providerText('provider.characterAi.description');
    },
    requiresApiKey: true,
    supportsAutomaticModels: false,
    available: false,
  },
];
