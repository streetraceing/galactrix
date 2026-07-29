import { Toast } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { I18nProvider } from './i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <NextThemesProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        enableColorScheme
        disableTransitionOnChange
        storageKey="galactrix-theme-mode"
        themes={['light', 'dark']}
      >
        {children}
        <Toast.Provider
          placement="top end"
          width="min(26rem, calc(100vw - 1rem))"
          maxVisibleToasts={3}
          className="top-[max(0.5rem,env(safe-area-inset-top))]"
        />
      </NextThemesProvider>
    </I18nProvider>
  );
}
