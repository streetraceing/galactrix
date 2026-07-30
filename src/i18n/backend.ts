import { i18next, type MessageVariables } from './index';

export type BackendErrorPayload = {
  key: string;
  variables?: MessageVariables;
};

function isBackendError(value: unknown): value is BackendErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof (value as { key?: unknown }).key === 'string'
  );
}

function parseJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export function getBackendErrorPayload(
  value: unknown,
  depth = 0,
): BackendErrorPayload | undefined {
  if (depth > 4) return undefined;
  if (isBackendError(value)) return value;

  if (value instanceof Error) {
    return (
      getBackendErrorPayload(value.cause, depth + 1) ??
      getBackendErrorPayload(value.message, depth + 1)
    );
  }

  if (typeof value === 'string') {
    return getBackendErrorPayload(parseJson(value), depth + 1);
  }

  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return (
    getBackendErrorPayload(record.error, depth + 1) ??
    getBackendErrorPayload(record.cause, depth + 1) ??
    getBackendErrorPayload(record.message, depth + 1)
  );
}

export function localizeBackendError(error: unknown) {
  const payload = getBackendErrorPayload(error);
  if (payload && i18next.exists(payload.key, { ns: 'backend' })) {
    return i18next.t(payload.key as never, {
      ns: 'backend',
      ...payload.variables,
    });
  }

  return i18next.t('backend.internal' as never, {
    ns: 'backend',
    detail: i18next.t('errors.unknown'),
  });
}
