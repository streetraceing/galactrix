import { ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('chats');
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
              textValue={t(priority.labelKey)}
            >
              <span className="min-w-0 w-fit">
                <strong className="block text-sm">
                  {t(priority.labelKey)}
                </strong>
                <span className="block text-xs text-muted">
                  {t(priority.descriptionKey)}
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
