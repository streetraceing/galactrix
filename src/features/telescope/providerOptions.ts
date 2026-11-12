import type { JsonValue, ProviderOptions } from '../../types';

export function parseJsonObject(text: string): Record<string, JsonValue> {
  const value: unknown = JSON.parse(text.trim() || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
  return value as Record<string, JsonValue>;
}

/** Validate untrusted Telescope imports before they cross the IPC boundary. */
export function parseProviderOptions(
  value: unknown,
): ProviderOptions | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid provider options');
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const fail = () => {
    throw new Error('Invalid provider options');
  };
  for (const key of [
    'thinkingBudget',
    'topK',
    'seed',
    'frequencyPenalty',
    'presencePenalty',
    'repetitionPenalty',
    'embeddingDimensions',
  ]) {
    const n = source[key];
    if (n == null) continue;
    if (typeof n !== 'number' || !Number.isFinite(n)) return fail();
    if (
      ['thinkingBudget', 'topK', 'seed', 'embeddingDimensions'].includes(key) &&
      !Number.isSafeInteger(n)
    )
      return fail();
    if (key === 'thinkingBudget' && n < -1) return fail();
    if (['topK', 'embeddingDimensions'].includes(key) && n < 1) return fail();
    if (
      ['frequencyPenalty', 'presencePenalty'].includes(key) &&
      (n < -2 || n > 2)
    )
      return fail();
    if (key === 'repetitionPenalty' && n <= 0) return fail();
    result[key] = n;
  }
  const enums: Record<string, string[]> = {
    thinkingLevel: ['minimal', 'low', 'medium', 'high'],
    reasoningEffort: [
      'none',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ],
    maxTokensField: ['max_tokens', 'max_completion_tokens', 'omit'],
    embeddingFormat: ['auto', 'openai', 'ollama'],
  };
  for (const [key, choices] of Object.entries(enums)) {
    const v = source[key];
    if (v == null) continue;
    if (typeof v !== 'string' || !choices.includes(v)) return fail();
    result[key] = v;
  }
  for (const key of ['omitSampling', 'noAuth', 'streamUsage']) {
    if (source[key] == null) continue;
    if (typeof source[key] !== 'boolean') return fail();
    result[key] = source[key];
  }
  for (const key of ['chatPath', 'modelsPath', 'authHeader', 'authPrefix']) {
    if (source[key] == null) continue;
    if (typeof source[key] !== 'string') return fail();
    result[key] = source[key];
  }
  if (source.stop != null) {
    if (
      !Array.isArray(source.stop) ||
      source.stop.length > 16 ||
      source.stop.some((s) => typeof s !== 'string' || !s || s.length > 2000)
    )
      return fail();
    result.stop = [...source.stop];
  }
  for (const key of ['extraBody', 'embeddingExtraBody', 'headers']) {
    if (source[key] == null) continue;
    const v = source[key];
    if (typeof v !== 'object' || Array.isArray(v)) return fail();
    result[key] = structuredClone(v);
  }
  if (
    result.headers &&
    Object.values(result.headers).some((v) => typeof v !== 'string')
  )
    return fail();
  if (JSON.stringify(result).length > 64000) return fail();
  if (result.thinkingLevel != null && result.thinkingBudget != null)
    return fail();
  for (const key of ['extraBody', 'embeddingExtraBody']) {
    const obj = result[key] as Record<string, unknown> | undefined;
    if (
      obj &&
      ['model', 'messages', 'stream', 'input', 'prompt'].some(
        (name) => name in obj,
      )
    )
      return fail();
  }
  return result as ProviderOptions;
}

export const compatiblePresets = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    options: { maxTokensField: 'max_completion_tokens' },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    options: {},
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    options: {},
  },
  {
    id: 'gemini',
    name: 'Gemini · OpenAI API',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    options: {},
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    options: { streamUsage: false },
  },
  {
    id: 'local',
    name: 'LM Studio / vLLM',
    baseUrl: 'http://localhost:1234/v1',
    options: { noAuth: true, streamUsage: false },
  },
] satisfies Array<{
  id: string;
  name: string;
  baseUrl: string;
  options: ProviderOptions;
}>;
