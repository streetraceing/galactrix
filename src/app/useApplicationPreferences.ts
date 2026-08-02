import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { setLanguagePreference } from '../i18n';
import { writeStorageItem } from '../lib/storage';
import type { AppSettings } from '../types';

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
    document.documentElement.style.fontSize = `${16 * scale}px`;
    document.documentElement.dataset.animations = settings.animations
      ? 'on'
      : 'off';
    document.documentElement.dataset.compact = settings.compactMode
      ? 'on'
      : 'off';
  }, [settings.animations, settings.compactMode, settings.interfaceScale]);
}
