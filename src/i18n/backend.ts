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

export function localizeBackendError(error: unknown) {
  if (isBackendError(error)) {
    const translated = i18next.t(error.key as never, {
      ns: 'backend',
      ...error.variables,
      defaultValue: '',
    });
    if (translated) return translated;
  }

  return error instanceof Error ? error.message : String(error);
}
