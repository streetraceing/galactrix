import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { CharacterData, GalaxyItem } from '../../../../types';
import { stylePresets } from '../../model';
import { DefinitionSectionsEditor } from './DefinitionSectionsEditor';
import { EditorSection } from './EditorSection';

const NONE_KEY = '__none__';

export function CharacterEditor({
  data,
  styles,
  onChange,
}: {
  data: CharacterData;
  styles: GalaxyItem[];
  onChange: (data: CharacterData) => void;
}) {
  const patch = <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K],
  ) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <EditorSection
        title="Стиль переписки"
        description="Встроенный стиль или собственный пресет из библиотеки «Галактики»."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Пресет</Label>
            <Select
              fullWidth
              variant="secondary"
              value={data.stylePreset}
              onChange={(key: Key | Key[] | null) => {
                if (key == null || Array.isArray(key)) return;
                const stylePreset = String(key) as CharacterData['stylePreset'];
                onChange({
                  ...data,
                  stylePreset,
                  styleItemId:
                    stylePreset === 'custom' ? data.styleItemId : undefined,
                });
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="bg-surface/75 backdrop-blur-md">
                <ListBox>
                  {stylePresets.map((preset) => (
                    <ListBox.Item
                      key={preset.id}
                      id={preset.id}
                      textValue={preset.label}
                    >
                      {preset.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {data.stylePreset === 'custom' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Сохранённый стиль</Label>
              <Select
                fullWidth
                variant="secondary"
                value={data.styleItemId ?? NONE_KEY}
                placeholder="Выберите стиль"
                onChange={(key: Key | Key[] | null) => {
                  if (Array.isArray(key)) return;
                  const value = key == null ? NONE_KEY : String(key);
                  patch('styleItemId', value === NONE_KEY ? undefined : value);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-surface/75 backdrop-blur-md">
                  <ListBox>
                    <ListBox.Item id={NONE_KEY} textValue="Стиль не выбран">
                      <span className="text-muted">Стиль не выбран</span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {styles.map((style) => (
                      <ListBox.Item
                        key={style.id}
                        id={style.id}
                        textValue={style.name}
                      >
                        {style.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          ) : null}
        </div>

        {data.stylePreset === 'custom' && styles.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted">
            Сначала создайте объект типа «Стиль» в библиотеке.
          </p>
        ) : null}
      </EditorSection>

      <DefinitionSectionsEditor
        title="Определение персонажа"
        description="Разделы объединяются по порядку в единое определение {{char}}."
        sections={data.definitionSections}
        onChange={(definitionSections) =>
          patch('definitionSections', definitionSections)
        }
      />
    </div>
  );
}
