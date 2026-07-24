import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Surface,
  TextArea,
} from '@heroui/react';
import type { Key } from 'react';
import { UiModal } from '../../../components/ui/UiModal';
import type {
  CharacterData,
  GalaxyItem,
  GalaxyItemInput,
  GalaxyKind,
  PersonaData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../../types';
import {
  galaxyFilters,
  galaxyKindDescriptions,
  galaxyKindLabels,
} from '../catalog';
import { emptyData } from '../model';
import { CharacterEditor } from './editors/CharacterEditor';
import { PersonaEditor } from './editors/PersonaEditor';
import { StyleEditor } from './editors/StyleEditor';
import { UniverseEditor } from './editors/UniverseEditor';
import { WorldbookEditor } from './editors/WorldbookEditor';

function descriptionPlaceholder(kind: GalaxyKind) {
  switch (kind) {
    case 'persona':
      return 'Краткое описание пользователя, которое модель должна помнить';
    case 'character':
      return 'Короткое описание персонажа';
    case 'universe':
      return 'Общее описание мира и текущего сеттинга';
    case 'worldbook':
      return 'Краткое назначение этого ворлдбука';
    case 'style':
      return 'Краткое описание стиля переписки';
  }
}

export function GalaxyEditorModal({
  isOpen,
  editing,
  draft,
  styles,
  saving,
  error,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  isOpen: boolean;
  editing: GalaxyItem | null;
  draft: GalaxyItemInput;
  styles: GalaxyItem[];
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: GalaxyItemInput) => void;
  onSave: () => void;
}) {
  const changeKind = (kind: GalaxyKind) =>
    onDraftChange({
      ...draft,
      kind,
      data: emptyData(kind),
    });

  const characterData =
    draft.kind === 'character' ? (draft.data as CharacterData) : null;
  const customStyleMissing = Boolean(
    characterData?.stylePreset === 'custom' && !characterData.styleItemId,
  );
  const canSave = Boolean(draft.name.trim()) && !customStyleMissing;

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        editing
          ? `Редактирование: ${editing.name}`
          : `Новый объект — ${galaxyKindLabels[draft.kind]}`
      }
      description="Структурированные параметры хранятся локально и становятся частью системного промпта только в выбранных чатах."
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!canSave}
            onPress={onSave}
          >
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
          <div className="flex gap-4 flex-col">
            <div className="flex flex-col gap-1.5">
              <Label>Тип объекта</Label>
              <Select
                fullWidth
                variant="secondary"
                value={draft.kind}
                isDisabled={Boolean(editing)}
                onChange={(key: Key | Key[] | null) => {
                  if (key == null || Array.isArray(key)) return;
                  changeKind(String(key) as GalaxyKind);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-surface/75 backdrop-blur-md">
                  <ListBox>
                    {galaxyFilters.slice(1).map((entry) => (
                      <ListBox.Item
                        key={entry.id}
                        id={entry.id}
                        textValue={entry.label}
                      >
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm font-medium">
                            {entry.label}
                          </strong>
                          <span className="mt-0.5 block text-xs leading-5 text-muted">
                            {galaxyKindDescriptions[entry.id as GalaxyKind]}
                          </span>
                        </span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <p className="text-xs leading-5 text-muted">
                {galaxyKindDescriptions[draft.kind]}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="galaxy-name">Название</Label>
              <Input
                id="galaxy-name"
                fullWidth
                variant="secondary"
                value={draft.name}
                placeholder="Название объекта"
                autoFocus
                maxLength={120}
                onChange={(event) =>
                  onDraftChange({ ...draft, name: event.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="galaxy-description">Краткое описание</Label>
            <TextArea
              id="galaxy-description"
              fullWidth
              variant="secondary"
              rows={3}
              value={draft.description}
              placeholder={descriptionPlaceholder(draft.kind)}
              onChange={(event) =>
                onDraftChange({ ...draft, description: event.target.value })
              }
            />
          </div>
        </Surface>

        {draft.kind === 'persona' ? (
          <PersonaEditor
            data={draft.data as PersonaData}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'character' ? (
          <CharacterEditor
            data={draft.data as CharacterData}
            styles={styles}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'universe' ? (
          <UniverseEditor
            data={draft.data as UniverseData}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'worldbook' ? (
          <WorldbookEditor
            data={draft.data as WorldbookData}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'style' ? (
          <StyleEditor
            data={draft.data as StyleData}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}

        {customStyleMissing ? (
          <p className="text-sm text-warning">
            Для кастомного стиля выберите сохранённый пресет из библиотеки.
          </p>
        ) : null}
        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
