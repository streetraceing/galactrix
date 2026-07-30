import { ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { PromptPriority } from '../../../../types';
import { promptPriorities } from '../../promptConfig';

export function PromptPrioritySelect({
  value,
  label,
  onChange,
}: {
  value: PromptPriority;
  label: string;
  onChange: (value: PromptPriority) => void;
}) {
  return (
    <Select
      value={value}
      variant="secondary"
      aria-label={label}
      onChange={(key: Key | Key[] | null) => {
        if (typeof key === 'string') onChange(key as PromptPriority);
      }}
    >
      <Select.Trigger className="w-full">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {promptPriorities.map((priority) => (
            <ListBox.Item
              key={priority.id}
              id={priority.id}
              textValue={priority.label}
            >
              <span className="min-w-0 w-fit">
                <strong className="block text-sm">{priority.label}</strong>
                <span className="block text-xs text-muted">
                  {priority.description}
                </span>
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
