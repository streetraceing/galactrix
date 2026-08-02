import type { AppLocale } from './resources';
import { readStorageItem, writeStorageItem } from '../lib/storage';

export const supportedLocales = [
  'en',
  'ru',
] as const satisfies readonly AppLocale[];
export type LanguagePreference = 'system' | AppLocale;

const STORAGE_KEY = 'galactrix-language';

export function getLanguagePreference(): LanguagePreference {
  const value = readStorageItem(STORAGE_KEY);
  return value === 'en' || value === 'ru' || value === 'system'
    ? value
    : 'system';
}

export function storeLanguagePreference(value: LanguagePreference) {
  writeStorageItem(STORAGE_KEY, value);
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
