import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import { ProviderLogo } from '../../../components/ui/ProviderLogo';
import type { Provider } from '../../../types';
import { useTranslation } from 'react-i18next';

const NONE_KEY = '__none__';

export function ChatProviderPicker({
  providers,
  value,
  onChange,
}: {
  providers: Provider[];
  value?: string;
  onChange: (value?: string) => void;
}) {
  const { t } = useTranslation('chats');
  const selectedProvider = providers.find((provider) => provider.id === value);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{t('chatProviderPicker.provider')}</Label>
      <Select
        fullWidth
        variant="secondary"
        value={value ?? NONE_KEY}
        placeholder={t('chatProviderPicker.selectAConnection')}
        onChange={(key: Key | Key[] | null) => {
          if (Array.isArray(key)) return;
          const next = key == null ? NONE_KEY : String(key);
          onChange(next === NONE_KEY ? undefined : next);
        }}
      >
        <Select.Trigger className="min-w-0 overflow-hidden">
          <Select.Value className="min-w-0 flex-1 overflow-hidden min-h-6 flex items-center">
            <span className="flex min-w-0 items-center gap-2">
              {selectedProvider ? (
                <ProviderLogo
                  kind={selectedProvider.kind}
                  name={selectedProvider.name}
                  className="size-6 rounded-lg"
                  padding={false}
                />
              ) : null}
              <span className="block min-w-0 truncate">
                {selectedProvider?.name ?? t('chatProviderPicker.noProvider')}
              </span>
            </span>
          </Select.Value>
          <Select.Indicator className="shrink-0" />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item
              id={NONE_KEY}
              textValue={t('chatProviderPicker.noProvider')}
            >
              <span className="text-muted">
                {t('chatProviderPicker.noProvider')}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {providers.map((provider) => (
              <ListBox.Item
                key={provider.id}
                id={provider.id}
                textValue={provider.name}
              >
                <ProviderLogo
                  kind={provider.kind}
                  name={provider.name}
                  className="size-8 rounded-lg"
                  padding={false}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium">
                    {provider.name}
                  </strong>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {provider.model}
                  </span>
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
