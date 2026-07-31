import { Input, Label, ListBox, Select } from '@heroui/react';
import type { ChangeEvent, Key } from 'react';
import type { Provider } from '../../../types';

export function ModuleNumberField({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
      <div className="min-w-0">
        <strong className="block text-sm font-medium">{label}</strong>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
      <Input
        type="number"
        fullWidth
        variant="secondary"
        min={min}
        max={max}
        step={step}
        value={String(value)}
        aria-label={label}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </div>
  );
}

export function ModuleProviderSelect({
  label,
  description,
  value,
  providers,
  automaticLabel,
  onChange,
}: {
  label: string;
  description: string;
  value?: string;
  providers: Provider[];
  automaticLabel: string;
  onChange: (value?: string) => void;
}) {
  return (
    <div className="min-w-0 py-3 first:pt-0">
      <Label>{label}</Label>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      <Select
        className="mt-2 min-w-0 max-w-full"
        fullWidth
        variant="secondary"
        value={value ?? '__automatic__'}
        aria-label={label}
        onChange={(key: Key | Key[] | null) => {
          const selected = String(key ?? '__automatic__');
          onChange(selected === '__automatic__' ? undefined : selected);
        }}
      >
        <Select.Trigger className="w-full min-w-0 max-w-full">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="__automatic__" textValue={automaticLabel}>
              <span>{automaticLabel}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {providers.map((provider) => (
              <ListBox.Item
                id={provider.id}
                key={provider.id}
                textValue={provider.name}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm">
                    {provider.name}
                  </strong>
                  <span className="block truncate text-xs text-muted">
                    {provider.embeddingModel || provider.model}
                  </span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
