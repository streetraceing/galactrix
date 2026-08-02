import { i18next } from './config';
import {
  getLanguagePreference,
  resolveLocale,
  storeLanguagePreference,
  type LanguagePreference,
} from './language';
import type { AppLocale } from './resources';
import { formatRelativeTimeForLocale } from './relativeTime';
import type { I18nNamespace, TranslationKey } from './resources';

export { i18next };
export { getLanguagePreference };
export { I18nProvider } from './provider';
export type { AppLocale, I18nNamespace } from './resources';
export type { TranslationKey } from './resources';
export type { LanguagePreference } from './language';

export type MessageVariables = Record<string, string | number>;

export function translate<Namespace extends I18nNamespace>(
  namespace: Namespace,
  key: TranslationKey<Namespace>,
  variables: MessageVariables = {},
) {
  return i18next.t(key as never, {
    ns: namespace,
    ...variables,
  });
}

export function getLocale(): AppLocale {
  const language = i18next.resolvedLanguage ?? i18next.language;
  return language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function getResponseLocale(preference: 'app' | 'auto') {
  return preference === 'app' ? getLocale() : undefined;
}

export function setLanguagePreference(value: LanguagePreference) {
  storeLanguagePreference(value);
  void i18next.changeLanguage(resolveLocale(value));
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(getLocale(), options).format(value);
}

export function formatRelativeTime(
  timestampSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
  locale: AppLocale = getLocale(),
) {
  return formatRelativeTimeForLocale(timestampSeconds, nowSeconds, locale);
}
