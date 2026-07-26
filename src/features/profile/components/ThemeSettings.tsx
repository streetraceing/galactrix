import { Label, ListBox, Select, Surface } from '@heroui/react';
import type { AppSettings } from '../../../types';

const modes = [
  { id: 'system', label: 'Системная' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'light', label: 'Светлая' },
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
  return (
    <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
      <h2 className="section-title">Оформление</h2>
      <p className="section-description">
        Светлая или тёмная схема выбирается отдельно от цветового варианта.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Режим</Label>
          <Select
            aria-label="Режим темы"
            variant="secondary"
            value={mode}
            onChange={(value) => {
              if (typeof value === 'string') {
                onModeChange(value as AppSettings['themeMode']);
              }
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {modes.map((entry) => (
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
        <div className="flex flex-col gap-1.5">
          <Label>Цветовой вариант</Label>
          <Select
            aria-label="Цветовой вариант темы"
            value={variant}
            variant="secondary"
            onChange={(value) => {
              if (typeof value === 'string') {
                onVariantChange(value as AppSettings['themeVariant']);
              }
            }}
          >
            <Select.Trigger className="w-full">
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
