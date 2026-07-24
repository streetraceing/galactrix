import { Chip, Label, ListBox, Select, Surface } from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../components/Icon';
import type { ChatConfigInput, GalaxyItem } from '../../../types';
import { GalaxySelectField } from './GalaxySelectField';

function ofKind(items: GalaxyItem[], kind: GalaxyItem['kind']) {
  return items.filter((item) => item.kind === kind);
}

export function ChatContextPicker({
  galaxyItems,
  value,
  onChange,
}: {
  galaxyItems: GalaxyItem[];
  value: ChatConfigInput;
  onChange: (value: ChatConfigInput) => void;
}) {
  const personas = ofKind(galaxyItems, 'persona');
  const characters = ofKind(galaxyItems, 'character');
  const universes = ofKind(galaxyItems, 'universe');
  const worldbooks = ofKind(galaxyItems, 'worldbook');
  const selectedCount =
    Number(Boolean(value.personaId)) +
    Number(Boolean(value.characterId)) +
    Number(Boolean(value.universeId)) +
    value.worldbookIds.length;

  return (
    <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="galaxies" className="size-4" />
            </span>
            <h3 className="text-sm font-semibold">Ролевой контекст</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Одна персона пользователя, один персонаж, одна вселенная и несколько
            ворлдбуков.
          </p>
        </div>
        <Chip size="sm" variant="soft">
          {selectedCount}
        </Chip>
      </div>

      <div className="flex gap-4 flex-col">
        <GalaxySelectField
          label="Персона пользователя"
          placeholder="Без персоны"
          items={personas}
          value={value.personaId}
          onChange={(personaId) => onChange({ ...value, personaId })}
        />
        <GalaxySelectField
          label="Персонаж ассистента"
          placeholder="Без персонажа"
          items={characters}
          value={value.characterId}
          onChange={(characterId) => onChange({ ...value, characterId })}
        />
        <GalaxySelectField
          label="Вселенная"
          placeholder="Без вселенной"
          items={universes}
          value={value.universeId}
          onChange={(universeId) => onChange({ ...value, universeId })}
        />
        <div className="flex flex-col gap-1.5">
          <Label>Ворлдбуки</Label>
          <Select
            fullWidth
            variant="secondary"
            selectionMode="multiple"
            value={value.worldbookIds}
            placeholder="Выберите ворлдбуки"
            onChange={(keys: Key | Key[] | null) =>
              onChange({
                ...value,
                worldbookIds: Array.isArray(keys)
                  ? keys.map(String)
                  : keys == null
                    ? []
                    : [String(keys)],
              })
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {worldbooks.map((item) => (
                  <ListBox.Item
                    key={item.id}
                    id={item.id}
                    textValue={item.name}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {galaxyItems.length === 0 ? (
        <div className="mt-4 flex items-start gap-2 border-t border-separator pt-4 text-xs leading-5 text-muted">
          <Icon name="info" className="mt-0.5 size-4 shrink-0 text-accent" />
          Создайте персоны, персонажей и лор во вкладке «Галактики», чтобы
          подключать их к чатам.
        </div>
      ) : null}
    </Surface>
  );
}
