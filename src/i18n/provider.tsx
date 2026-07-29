import { useEffect, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { i18next } from './config';
import { getLanguagePreference, resolveLocale } from './language';

function LanguageEffects() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const syncDocumentLanguage = (language: string) => {
      document.documentElement.lang = language;
    };
    syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
    i18n.on('languageChanged', syncDocumentLanguage);
    return () => i18n.off('languageChanged', syncDocumentLanguage);
  }, [i18n]);

  useEffect(() => {
    const syncSystemLanguage = () => {
      if (getLanguagePreference() === 'system') {
        void i18n.changeLanguage(resolveLocale('system'));
      }
    };
    window.addEventListener('languagechange', syncSystemLanguage);
    return () =>
      window.removeEventListener('languagechange', syncSystemLanguage);
  }, [i18n]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18next}>
      <LanguageEffects />
      {children}
    </I18nextProvider>
  );
}
