import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resolveLocale, supportedLocales } from './language';
import { namespaces, resources } from './resources';

void i18next.use(initReactI18next).init({
  resources,
  lng: resolveLocale(),
  fallbackLng: 'en',
  supportedLngs: supportedLocales,
  defaultNS: 'common',
  fallbackNS: 'common',
  ns: namespaces,
  keySeparator: false,
  nsSeparator: ':',
  returnNull: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export { i18next };
