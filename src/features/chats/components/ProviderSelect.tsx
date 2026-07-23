import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { Provider } from '../../../types';

export function ProviderSelect({
  providers,
  value,
  onChange,
}: {
  providers: Provider[];
  value?: string;
  onChange: (providerId?: string) => void;
}) {
  return (
    <Select
      variant="secondary"
      value={value ?? null}
      onChange={(key: Key | Key[] | null) =>
        onChange(key ? String(key) : undefined)
      }
      placeholder="Выберите провайдера"
      aria-label="Провайдер чата"
      className="w-fit"
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="" textValue="Без провайдера">
            <Label>Без провайдера</Label>
          </ListBox.Item>
          {providers.map((provider) => (
            <ListBox.Item
              key={provider.id}
              id={provider.id}
              textValue={`${provider.name} ${provider.model}`}
            >
              <Label>
                {provider.name} · {provider.model}
              </Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
