import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import type { CharacterData, GalaxyItem } from '../../../../types';
import { stylePresets } from '../../model';
import { DefinitionSectionsEditor } from './DefinitionSectionsEditor';
import { EditorSection } from './EditorSection';
import { useTranslation } from 'react-i18next';

const NONE_KEY = '__none__';

export function CharacterEditor({
  data,
  styles,
  promptSets,
  onChange,
}: {
  data: CharacterData;
  styles: GalaxyItem[];
  promptSets: GalaxyItem[];
  onChange: (data: CharacterData) => void;
}) {
  const { t } = useTranslation('galaxies');
  const patch = <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K],
  ) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <EditorSection
        title={t('characterEditor.messagingStyle')}
        description={t('characterEditor.aBuiltInStyleOrACustomPresetFromThe')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t('characterEditor.preset')}</Label>
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
              <Select.Popover>
                <ListBox>
                  {stylePresets.map((preset) => (
                    <ListBox.Item
                      key={preset.id}
                      id={preset.id}
                      textValue={t(preset.labelKey)}
                    >
                      {t(preset.labelKey)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {data.stylePreset === 'custom' ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t('characterEditor.savedStyle')}</Label>
              <Select
                fullWidth
                variant="secondary"
                value={data.styleItemId ?? NONE_KEY}
                placeholder={t('characterEditor.selectAStyle')}
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
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item
                      id={NONE_KEY}
                      textValue={t('characterEditor.noStyleSelected')}
                    >
                      <span className="text-muted">
                        {t('characterEditor.noStyleSelected')}
                      </span>
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
            {t('characterEditor.firstCreateAStyleObjectInTheLibrary')}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title={t('characterEditor.promptSets')}
        description={t(
          'characterEditor.reusableRulesAreConnectedToEveryChatWithThisCharacter',
        )}
      >
        <Select
          fullWidth
          variant="secondary"
          selectionMode="multiple"
          value={data.promptSetIds}
          placeholder={t('characterEditor.noPromptSetsSelected')}
          onChange={(keys: Key | Key[] | null) =>
            patch(
              'promptSetIds',
              Array.isArray(keys)
                ? keys.map(String)
                : keys == null
                  ? []
                  : [String(keys)],
            )
          }
        >
          <Label>{t('characterEditor.connectedSets')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox selectionMode="multiple">
              {promptSets.map((set) => (
                <ListBox.Item key={set.id} id={set.id} textValue={set.name}>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {set.name}
                    </strong>
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
        {promptSets.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            {t('characterEditor.createASetInPromptSetsToConnectItHere')}
          </p>
        ) : null}
      </EditorSection>

      <DefinitionSectionsEditor
        title={t('characterEditor.characterDefinition')}
        description={t(
          'characterEditor.sectionsAreCombinedInOrderIntoASingleDefinitionOf',
        )}
        sections={data.definitionSections}
        onChange={(definitionSections) =>
          patch('definitionSections', definitionSections)
        }
      />
    </div>
  );
}
