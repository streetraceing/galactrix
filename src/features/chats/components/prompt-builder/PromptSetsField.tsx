import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { GalaxyItem } from '../../../../types';
import { useTranslation } from 'react-i18next';

export function PromptSetsField({
  sets,
  value,
  onChange,
}: {
  sets: GalaxyItem[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation('chats');
  return (
    <div className="border-b border-separator px-4 py-4 sm:px-5">
      <Select
        fullWidth
        variant="secondary"
        selectionMode="multiple"
        value={value}
        placeholder={t('promptSetsField.noPromptSetsSelected')}
        onChange={(keys: Key | Key[] | null) =>
          onChange(
            Array.isArray(keys)
              ? keys.map(String)
              : keys == null
                ? []
                : [String(keys)],
          )
        }
      >
        <Label>{t('promptSetsField.connectedPromptSets')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox selectionMode="multiple">
            {sets.map((set) => (
              <ListBox.Item key={set.id} id={set.id} textValue={set.name}>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{set.name}</strong>
                  {set.description ? (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {set.description}
                    </span>
                  ) : null}
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <p className="mt-1.5 text-xs leading-5 text-muted">
        {t('promptSetsField.promptSetsExtendThisChatSRulesAndBlocksThey')}
      </p>
    </div>
  );
}
