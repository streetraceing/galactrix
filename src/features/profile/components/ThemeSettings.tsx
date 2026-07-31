import { Label, ListBox, Select, Surface } from '@heroui/react';
import type { AppSettings } from '../../../types';
import { useTranslation } from 'react-i18next';

const modes = [
  { id: 'system', labelKey: 'theme.system' },
  { id: 'dark', labelKey: 'theme.dark' },
  { id: 'light', labelKey: 'theme.light' },
] as const;

const variants = [
  { id: 'default', label: 'Galactrix' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'discord', label: 'Discord' },
  { id: 'spotify', label: 'Spotify' },
] as const;

export function ThemeSettings({
  mode,
  variant,
  onModeChange,
  onVariantChange,
}: {
  mode: AppSettings['themeMode'];
  variant: AppSettings['themeVariant'];
  onModeChange: (value: AppSettings['themeMode']) => void;
  onVariantChange: (value: AppSettings['themeVariant']) => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <Surface className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-separator p-4 sm:p-5">
      <h2 className="section-title">{t('themeSettings.appearance')}</h2>
      <p className="section-description">
        {t('themeSettings.theLightOrDarkModeIsSelectedSeparatelyFromThe')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t('themeSettings.mode')}</Label>
          <Select
            fullWidth
            className="w-full min-w-0 max-w-full"
            aria-label={t('themeSettings.themeMode')}
            variant="secondary"
            value={mode}
            onChange={(value) => {
              if (typeof value === 'string') {
                onModeChange(value as AppSettings['themeMode']);
              }
            }}
          >
            <Select.Trigger className="w-full min-w-0 max-w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {modes.map((entry) => (
                  <ListBox.Item
                    key={entry.id}
                    id={entry.id}
                    textValue={t(entry.labelKey)}
                  >
                    {t(entry.labelKey)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('themeSettings.colorTheme')}</Label>
          <Select
            fullWidth
            className="w-full min-w-0 max-w-full"
            aria-label={t('themeSettings.themeColorVariant')}
            value={variant}
            variant="secondary"
            onChange={(value) => {
              if (typeof value === 'string') {
                onVariantChange(value as AppSettings['themeVariant']);
              }
            }}
          >
            <Select.Trigger className="w-full min-w-0 max-w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {variants.map((entry) => (
                  <ListBox.Item
                    key={entry.id}
                    id={entry.id}
                    textValue={entry.label}
                  >
                    {entry.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    </Surface>
  );
}
