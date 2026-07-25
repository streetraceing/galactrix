import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { GalaxyItem } from '../../../types';

const NONE_KEY = '__none__';

export function GalaxySelectField({
  label,
  placeholder,
  items,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: GalaxyItem[];
  value?: string;
  onChange: (value?: string) => void;
}) {
  const selectedItem = items.find((item) => item.id === value);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        fullWidth
        variant="secondary"
        value={value ?? NONE_KEY}
        placeholder={placeholder}
        onChange={(key: Key | Key[] | null) => {
          if (Array.isArray(key)) return;
          const next = key == null ? NONE_KEY : String(key);
          onChange(next === NONE_KEY ? undefined : next);
        }}
      >
        <Select.Trigger className="min-w-0 overflow-hidden">
          <Select.Value className="min-w-0 flex-1 overflow-hidden">
            <span className="block min-w-0 truncate">
              {selectedItem?.name ?? placeholder}
            </span>
          </Select.Value>
          <Select.Indicator className="shrink-0" />
        </Select.Trigger>
        <Select.Popover className="bg-surface-secondary">
          <ListBox>
            <ListBox.Item id={NONE_KEY} textValue={placeholder}>
              <span className="text-muted">{placeholder}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                <span className="min-w-0 flex-1 overflow-hidden">
                  <strong className="block truncate text-sm font-medium">
                    {item.name}
                  </strong>
                  {item.description ? (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {item.description}
                    </span>
                  ) : null}
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
