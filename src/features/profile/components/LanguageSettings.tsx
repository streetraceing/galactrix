import { ListBox, Select, Surface } from '@heroui/react';
import type { AppSettings } from '../../../types';
import { useTranslation } from 'react-i18next';

const languages = [
  {
    id: 'system',
    labelKey: 'language.system.label',
    descriptionKey: 'language.system.description',
  },
  {
    id: 'ru',
    labelKey: 'language.ru.label',
    descriptionKey: 'language.ru.description',
  },
  {
    id: 'en',
    labelKey: 'language.en.label',
    descriptionKey: 'language.en.description',
  },
] as const;

export function LanguageSettings({
  value,
  onChange,
}: {
  value: AppSettings['language'];
  onChange: (value: AppSettings['language']) => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
      <h2 className="section-title">
        {t('languageSettings.interfaceLanguage')}
      </h2>
      <p className="section-description">
        {t('languageSettings.byDefaultGalactrixFollowsTheDeviceLanguage')}
      </p>
      <div className="mt-4 flex flex-col gap-1.5">
        <Select
          aria-label={t('languageSettings.interfaceLanguage')}
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
                  textValue={t(language.labelKey)}
                >
                  <span className="min-w-0">
                    <strong className="block text-sm font-medium">
                      {t(language.labelKey)}
                    </strong>
                    <span className="block text-xs text-muted">
                      {t(language.descriptionKey)}
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
