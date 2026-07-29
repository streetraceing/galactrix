import type { AppLocale } from './resources';

export const supportedLocales = [
  'en',
  'ru',
] as const satisfies readonly AppLocale[];
export type LanguagePreference = 'system' | AppLocale;

const STORAGE_KEY = 'galactrix-language';

function hasStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function'
  );
}

export function getLanguagePreference(): LanguagePreference {
  if (!hasStorage()) return 'system';
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'en' || value === 'ru' || value === 'system'
    ? value
    : 'system';
}

export function storeLanguagePreference(value: LanguagePreference) {
  if (hasStorage()) localStorage.setItem(STORAGE_KEY, value);
}

export function getSystemLocale(): AppLocale {
  if (typeof navigator === 'undefined') return 'en';
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const match = languages
    .map((language) => language.toLowerCase().split('-')[0])
    .find((language): language is AppLocale =>
      supportedLocales.includes(language as AppLocale),
    );
  return match ?? 'en';
}

export function resolveLocale(
  preference: LanguagePreference = getLanguagePreference(),
) {
  return preference === 'system' ? getSystemLocale() : preference;
}
