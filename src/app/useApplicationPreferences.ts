import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { setLanguagePreference } from '../i18n';
import { writeStorageItem } from '../lib/storage';
import type { AppSettings } from '../types';
import { restoredScrollTop } from '../lib/scaleScroll';

const MIN_INTERFACE_SCALE = 0.8;
const MAX_INTERFACE_SCALE = 1.5;

export function useApplicationPreferences(settings: AppSettings) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(settings.themeMode);
    document.documentElement.dataset.themeVariant = settings.themeVariant;
    writeStorageItem('galactrix-theme-variant', settings.themeVariant);
  }, [setTheme, settings.themeMode, settings.themeVariant]);

  useEffect(() => {
    setLanguagePreference(settings.language);
  }, [settings.language]);

  useEffect(() => {
    const scale = Math.min(
      MAX_INTERFACE_SCALE,
      Math.max(MIN_INTERFACE_SCALE, settings.interfaceScale),
    );
    const scrollContainers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.page-scroll, .chat-message-scroller, .ui-modal-mobile-body',
      ),
    );
    const scrollSnapshots = scrollContainers.map((element) => ({
      element,
      before: {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      },
    }));

    document.documentElement.style.fontSize = `${16 * scale}px`;

    const frame = window.requestAnimationFrame(() => {
      for (const { element, before } of scrollSnapshots) {
        if (!element.isConnected) continue;
        element.scrollTop = restoredScrollTop(before, {
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [settings.interfaceScale]);

  useEffect(() => {
    document.documentElement.dataset.animations = settings.animations
      ? 'on'
      : 'off';
    document.documentElement.dataset.compact = settings.compactMode
      ? 'on'
      : 'off';
  }, [settings.animations, settings.compactMode]);
}
