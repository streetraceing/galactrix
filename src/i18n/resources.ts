import enBackend from './locales/en/backend.json';
import enChats from './locales/en/chats.json';
import enCommon from './locales/en/common.json';
import enGalaxies from './locales/en/galaxies.json';
import enProfile from './locales/en/profile.json';
import enSettings from './locales/en/settings.json';
import enTelescope from './locales/en/telescope.json';
import ruBackend from './locales/ru/backend.json';
import ruChats from './locales/ru/chats.json';
import ruCommon from './locales/ru/common.json';
import ruGalaxies from './locales/ru/galaxies.json';
import ruProfile from './locales/ru/profile.json';
import ruSettings from './locales/ru/settings.json';
import ruTelescope from './locales/ru/telescope.json';

export const namespaces = [
  'common',
  'chats',
  'galaxies',
  'telescope',
  'profile',
  'settings',
  'backend',
] as const;

export const resources = {
  en: {
    common: enCommon,
    chats: enChats,
    galaxies: enGalaxies,
    telescope: enTelescope,
    profile: enProfile,
    settings: enSettings,
    backend: enBackend,
  },
  ru: {
    common: ruCommon,
    chats: ruChats,
    galaxies: ruGalaxies,
    telescope: ruTelescope,
    profile: ruProfile,
    settings: ruSettings,
    backend: ruBackend,
  },
} as const;

export type AppLocale = keyof typeof resources;
export type I18nNamespace = (typeof namespaces)[number];
export type TranslationKey<Namespace extends I18nNamespace> =
  keyof (typeof resources)['en'][Namespace] & string;
