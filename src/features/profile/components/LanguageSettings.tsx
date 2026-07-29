import { Label, ListBox, Select, Surface } from '@heroui/react';
import type { AppSettings } from '../../../types';

const languages = [
  {
    id: 'system',
    label: 'Системный язык',
    description: 'Автоматически использовать язык устройства',
  },
  { id: 'ru', label: 'Русский', description: 'Русский язык интерфейса' },
  {
    id: 'en',
    label: 'Английский',
    description: 'Английский язык интерфейса',
  },
] as const;

export function LanguageSettings({
  value,
  onChange,
}: {
  value: AppSettings['language'];
  onChange: (value: AppSettings['language']) => void;
}) {
  return (
    <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
      <h2 className="section-title">Язык интерфейса</h2>
      <p className="section-description">
        По умолчанию Galactrix следует языку устройства.
      </p>
      <div className="mt-4 flex max-w-md flex-col gap-1.5">
        <Label>Язык</Label>
        <Select
          aria-label="Язык интерфейса"
          variant="secondary"
          value={value}
          onChange={(nextValue) => {
            if (typeof nextValue === 'string') {
              onChange(nextValue as AppSettings['language']);
            }
          }}
        >
          <Select.Trigger className="w-full">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {languages.map((language) => (
                <ListBox.Item
                  key={language.id}
                  id={language.id}
                  textValue={language.label}
                >
                  <span className="min-w-0">
                    <strong className="block text-sm font-medium">
                      {language.label}
                    </strong>
                    <span className="block text-xs text-muted">
                      {language.description}
                    </span>
                  </span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </Surface>
  );
}
