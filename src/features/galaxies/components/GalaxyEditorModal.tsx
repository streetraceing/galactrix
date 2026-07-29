import { Button, Input, Label, Surface, TextArea } from '@heroui/react';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { PromptBuilder } from '../../chats/components/PromptBuilder';
import { promptPreviewFromDraft } from '../../chats/promptPreview';
import { galaxyInputAvatar, withAvatar } from '../../../lib/avatar';
import type {
  CharacterData,
  GalaxyItem,
  GalaxyItemInput,
  GalaxyKind,
  PersonaData,
  PromptSetData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../../types';
import { galaxyKindDescriptions, galaxyKindLabels } from '../catalog';
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
    case 'prompt-set':
      return 'Когда и для каких персонажей стоит использовать этот набор';
  }
}

export function GalaxyEditorModal({
  isOpen,
  editing,
  draft,
  styles,
  promptSets,
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
  promptSets: GalaxyItem[];
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: GalaxyItemInput) => void;
  onSave: () => void;
}) {
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
          : `Новый объект - ${galaxyKindLabels[draft.kind]}`
      }
      description={galaxyKindDescriptions[draft.kind]}
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
        {draft.kind === 'persona' || draft.kind === 'character' ? (
          <Surface className="rounded-2xl border border-separator p-4 sm:p-5">
            <AvatarPicker
              value={galaxyInputAvatar(draft.data)}
              name={draft.name || galaxyKindLabels[draft.kind]}
              description="Фото будет показываться в библиотеке, заголовке чата и рядом с сообщениями."
              disabled={saving}
              onChange={(avatar) =>
                onDraftChange({
                  ...draft,
                  data: withAvatar(
                    draft.data as Record<string, unknown>,
                    avatar,
                  ),
                })
              }
            />
          </Surface>
        ) : null}

        <Surface className="rounded-2xl border border-separator p-4 sm:p-5 bg-surface-secondary/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="galaxy-name">Название</Label>
              <Input
                id="galaxy-name"
                fullWidth
                variant="secondary"
                value={draft.name}
                placeholder="Название объекта"
                autoFocus
                autoComplete="off"
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
              autoComplete="off"
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
            promptSets={promptSets}
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
        {draft.kind === 'prompt-set' ? (
          <PromptBuilder
            mode="set"
            value={draft.data as PromptSetData}
            onChange={(data) => onDraftChange({ ...draft, data })}
          />
        ) : null}

        <PromptPreviewCard
          input={promptPreviewFromDraft(draft, [...styles, ...promptSets])}
          title="Расчёт текущего промпта"
        />

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
