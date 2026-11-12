import type { Message } from '../../types';

export type GenerationFailureKind =
  | 'auth'
  | 'access'
  | 'quota'
  | 'rateLimit'
  | 'timeout'
  | 'network'
  | 'server'
  | 'context'
  | 'settings'
  | 'model'
  | 'empty'
  | 'unknown';
export type GenerationFailure = {
  id: string;
  chatId: string;
  messageId: string;
  mode: 'send' | 'regenerate' | 'continue';
  kind: GenerationFailureKind;
  status?: number;
  key?: string;
  details: string;
  customInstruction?: string;
  retryBlocked?: boolean;
};
const reportedErrors = new WeakSet<object>();
export function isReportedGenerationError(error: unknown) {
  return (
    typeof error === 'object' && error !== null && reportedErrors.has(error)
  );
}
export function markGenerationErrorReported(error: unknown) {
  if (typeof error === 'object' && error !== null) reportedErrors.add(error);
}

/** Diagnostics stay local and omit common credential forms before display/copy. */
export function sanitizeGenerationDetail(value: string): string {
  let text = value.slice(0, 16_000);
  try {
    const parsed = JSON.parse(text);
    const error = parsed?.error ?? parsed;
    if (error && typeof error === 'object') {
      text =
        ['message', 'type', 'code']
          .map((key) =>
            typeof error[key] === 'string' ? `${key}: ${error[key]}` : '',
          )
          .filter(Boolean)
          .join('\n') || '[JSON response omitted]';
    }
  } catch {
    /* Transport errors and non-JSON provider responses remain plain text. */
  }
  if (/<(?:!doctype|html|body)\b/i.test(text)) return '[HTML response omitted]';
  return text
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(
      /([?&](?:api[_-]?key|key|token|access_token|secret|password)=)[^\s&#]*/gi,
      '$1[redacted]',
    )
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9+/_.=:-]+/gi, '$1 [redacted]')
    .replace(
      /((?:["']?)(?:api[\s_-]?key|authorization|x-api-key|token|secret|password|cookie)(?:["']?)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi,
      '$1[redacted]',
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{20,})\b/g,
      '[redacted]',
    )
    .slice(0, 4000);
}

export function describeGenerationError(
  error: unknown,
): Pick<GenerationFailure, 'kind' | 'status' | 'key' | 'details'> {
  const record =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const variables =
    typeof record.variables === 'object' && record.variables !== null
      ? (record.variables as Record<string, unknown>)
      : {};
  const key = typeof record.key === 'string' ? record.key : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const detail =
    typeof variables.detail === 'string' ? variables.detail : message;
  const statusValue = String(
    variables.status ?? message.match(/\bHTTP\s+(\d{3})\b/i)?.[1] ?? '',
  );
  const status = /^[1-5]\d{2}$/.test(statusValue)
    ? Number(statusValue)
    : undefined;
  const text = `${key ?? ''} ${detail.slice(0, 16_000)}`.toLowerCase();
  let kind: GenerationFailureKind = 'unknown';
  if (/apikey|securestorage/.test(key?.toLowerCase() ?? '') || status === 401)
    kind = 'auth';
  else if (status === 403) kind = 'access';
  else if (
    status === 402 ||
    /insufficient_quota|quota_exceeded|credit balance|billing|payment required/.test(
      text,
    )
  )
    kind = 'quota';
  else if (status === 429) kind = 'rateLimit';
  else if (
    status === 408 ||
    status === 504 ||
    /timed? ?out|timeout|deadline/.test(text)
  )
    kind = 'timeout';
  else if (status !== undefined && status >= 500) kind = 'server';
  else if (
    status === 413 ||
    /context_length|context window|maximum context|too many tokens/.test(text)
  )
    kind = 'context';
  else if (
    status === 404 ||
    /backend\.provider\.(?:modelrequired|notfound|baseurlrequired|selectforchat)/.test(
      text,
    )
  )
    kind = 'model';
  else if (
    /connectionfailed|responsereadfailed|failed to fetch|network|dns|connection refused/.test(
      text,
    )
  )
    kind = 'network';
  else if (/emptyresponse/.test(text)) kind = 'empty';
  else if (
    status === 400 ||
    status === 422 ||
    /optionsinvalid|temperaturerange|topprange|maxtokenspositive/.test(text)
  )
    kind = 'settings';
  return { kind, status, key, details: sanitizeGenerationDetail(detail) };
}

/** Retry references an existing message, never re-sends the original user text. */
export function generationRetryTarget(
  failure: GenerationFailure,
  messages: Message[],
): string | undefined {
  if (failure.retryBlocked) return undefined;
  const target = messages.find(
    (message) =>
      message.id === failure.messageId &&
      message.chatId === failure.chatId &&
      !message.pending,
  );
  if (!target) return undefined;
  if (failure.mode === 'send') {
    const chatMessages = messages.filter(
      (message) => message.chatId === failure.chatId,
    );
    if (
      target.role !== 'user' ||
      chatMessages[chatMessages.length - 1]?.id !== target.id
    )
      return undefined;
  }
  if (failure.mode === 'regenerate' && target.role !== 'assistant')
    return undefined;
  if (failure.mode === 'continue' && target.role !== 'assistant')
    return undefined;
  return target.id;
}
