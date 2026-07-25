import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { Provider } from '../../../types';

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
  const selectedProvider = providers.find((provider) => provider.id === value);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>Провайдер</Label>
      <Select
        fullWidth
        variant="secondary"
        value={value ?? NONE_KEY}
        placeholder="Выберите подключение"
        onChange={(key: Key | Key[] | null) => {
          if (Array.isArray(key)) return;
          const next = key == null ? NONE_KEY : String(key);
          onChange(next === NONE_KEY ? undefined : next);
        }}
      >
        <Select.Trigger className="min-w-0 overflow-hidden">
          <Select.Value className="min-w-0 flex-1 overflow-hidden">
            <span className="block min-w-0 truncate">
              {selectedProvider?.name ?? 'Без провайдера'}
            </span>
          </Select.Value>
          <Select.Indicator className="shrink-0" />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id={NONE_KEY} textValue="Без провайдера">
              <span className="text-muted">Без провайдера</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {providers.map((provider) => (
              <ListBox.Item
                key={provider.id}
                id={provider.id}
                textValue={provider.name}
              >
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
