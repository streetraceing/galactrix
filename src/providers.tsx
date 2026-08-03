import { Toast } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { SwipeDismissToast } from './components/ui/SwipeDismissToast';
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
          width="min(26rem, calc(100dvw - 1rem - env(safe-area-inset-left) - env(safe-area-inset-right)))"
          maxVisibleToasts={3}
          className="app-toast-region"
        >
          {({ toast: toastItem }) => (
            <SwipeDismissToast toastItem={toastItem} />
          )}
        </Toast.Provider>
      </NextThemesProvider>
    </I18nProvider>
  );
}
