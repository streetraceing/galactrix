import { Chip, Label, ListBox, Select, Surface } from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../components/Icon';
import type { ChatConfigInput, GalaxyItem } from '../../../types';
import { GalaxySelectField } from './GalaxySelectField';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('chats');
  const personas = ofKind(galaxyItems, 'persona');
  const characters = ofKind(galaxyItems, 'character');
  const universes = ofKind(galaxyItems, 'universe');
  const worldbooks = ofKind(galaxyItems, 'worldbook');
  const selectedWorldbooks = worldbooks.filter((item) =>
    value.worldbookIds.includes(item.id),
  );
  const selectedCount =
    Number(Boolean(value.personaId)) +
    Number(Boolean(value.characterId)) +
    Number(Boolean(value.universeId)) +
    value.worldbookIds.length;
  const worldbookLabel =
    selectedWorldbooks.length === 0
      ? t('chatContextPicker.noWorldbooks')
      : selectedWorldbooks.length === 1
        ? selectedWorldbooks[0].name
        : `${selectedWorldbooks[0].name} +${selectedWorldbooks.length - 1}`;

  return (
    <Surface className="min-w-0 rounded-2xl border border-separator p-4 sm:p-5 bg-surface-secondary/50">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="galaxies" className="size-4" />
            </span>
            <h3 className="truncate text-sm font-semibold">
              {t('chatContextPicker.roleplayContext')}
            </h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            {t(
              'chatContextPicker.oneUserPersonaOneCharacterOneUniverseAndMultipleWorldbooks',
            )}
          </p>
        </div>
        <Chip size="sm" variant="soft" className="shrink-0 bg-transparent">
          {selectedCount}
        </Chip>
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <GalaxySelectField
          label={t('chatContextPicker.userPersona')}
          placeholder={t('chatContextPicker.noPersona')}
          items={personas}
          value={value.personaId}
          onChange={(personaId) => onChange({ ...value, personaId })}
        />
        <GalaxySelectField
          label={t('chatContextPicker.assistantCharacter')}
          placeholder={t('chatContextPicker.noCharacter')}
          items={characters}
          value={value.characterId}
          onChange={(characterId) => onChange({ ...value, characterId })}
        />
        <GalaxySelectField
          label={t('chatContextPicker.universe')}
          placeholder={t('chatContextPicker.noUniverse')}
          items={universes}
          value={value.universeId}
          onChange={(universeId) => onChange({ ...value, universeId })}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label>{t('chatContextPicker.worldbooks')}</Label>
          <Select
            fullWidth
            variant="secondary"
            selectionMode="multiple"
            value={value.worldbookIds}
            placeholder={t('chatContextPicker.selectWorldbooks')}
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
            <Select.Trigger className="min-w-0">
              <Select.Value className="min-w-0 flex-1">
                <span className="block min-w-0 truncate">{worldbookLabel}</span>
              </Select.Value>
              <Select.Indicator className="shrink-0" />
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
          {t(
            'chatContextPicker.createPersonasCharactersAndLoreInGalaxiesToConnectThem',
          )}
        </div>
      ) : null}
    </Surface>
  );
}
