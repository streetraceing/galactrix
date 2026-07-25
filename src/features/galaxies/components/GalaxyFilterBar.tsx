import {
  Chip,
  ListBox,
  Select,
  Surface,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import type { Key } from 'react';
import type { GalaxyItem, GalaxyKind } from '../../../types';
import { galaxyFilters } from '../catalog';

export function GalaxyFilterBar({
  items,
  value,
  onChange,
}: {
  items: GalaxyItem[];
  value: 'all' | GalaxyKind;
  onChange: (value: 'all' | GalaxyKind) => void;
}) {
  const getCount = (id: 'all' | GalaxyKind) =>
    id === 'all'
      ? items.length
      : items.filter((item) => item.kind === id).length;

  return (
    <>
      <Select
        fullWidth
        className="sm:hidden"
        value={value}
        aria-label="Фильтр библиотеки"
        onChange={(key: Key | Key[] | null) => {
          if (key != null && !Array.isArray(key)) {
            onChange(String(key) as 'all' | GalaxyKind);
          }
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {galaxyFilters.map((filter) => (
              <ListBox.Item
                key={filter.id}
                id={filter.id}
                textValue={filter.label}
              >
                <span className="min-w-0 flex-1 truncate">{filter.label}</span>
                <Chip size="sm" variant="soft" className="bg-transparent">
                  {getCount(filter.id)}
                </Chip>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Surface className="hidden overflow-x-auto rounded-2xl border-separator bg-transparent sm:block">
        <ToggleButtonGroup
          className="min-w-max"
          size="sm"
          isDetached
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[value]}
          onSelectionChange={(keys: Set<Key>) => {
            const selected = [...keys][0];
            if (selected != null) {
              onChange(String(selected) as 'all' | GalaxyKind);
            }
          }}
        >
          {galaxyFilters.map((filter) => (
            <ToggleButton key={filter.id} id={filter.id}>
              {filter.label}
              <Chip size="sm" variant="soft" className="bg-transparent">
                {getCount(filter.id)}
              </Chip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Surface>
    </>
  );
}
