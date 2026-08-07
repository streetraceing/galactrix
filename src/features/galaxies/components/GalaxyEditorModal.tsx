import { Button, Input, Label, Surface, TextArea } from '@heroui/react';
import { useEffect, useState } from 'react';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { PromptBuilder } from '../../chats/components/PromptBuilder';
import { promptPreviewFromDraft } from '../../chats/promptPreview';
import { galaxyInputAvatar, withAvatar } from '../../../lib/avatar';
import { isMobilePlatform } from '../../../lib/platform';
import type {
  CharacterData,
  GalaxyItem,
  GalaxyItemInput,
  PersonaData,
  PromptSetData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../../types';
import {
  galaxyEditorDescriptionKeys,
  galaxyKindDescriptionKeys,
  galaxyKindLabelKeys,
} from '../catalog';
import { CharacterEditor } from './editors/CharacterEditor';
import { PersonaEditor } from './editors/PersonaEditor';
import { StyleEditor } from './editors/StyleEditor';
import { UniverseEditor } from './editors/UniverseEditor';
import { WorldbookEditor } from './editors/WorldbookEditor';
import { useTranslation } from 'react-i18next';

export function GalaxyEditorModal({
  isOpen,
  editing,
  initialDraft,
  styles,
  promptSets,
  saving,
  error,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  editing: GalaxyItem | null;
  initialDraft: GalaxyItemInput;
  styles: GalaxyItem[];
  promptSets: GalaxyItem[];
  saving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: GalaxyItemInput) => void;
}) {
  const autoFocus = !isMobilePlatform();
  const { t } = useTranslation(['galaxies', 'common']);
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    if (isOpen) setDraft(initialDraft);
  }, [initialDraft, isOpen]);

  const characterData =
    draft.kind === 'character' ? (draft.data as CharacterData) : null;
  const customStyleMissing = Boolean(
    characterData?.stylePreset === 'custom' && !characterData.styleItemId,
  );
  const canSave = Boolean(draft.name.trim()) && !customStyleMissing;
  const draftKindLabel = t(galaxyKindLabelKeys[draft.kind], { ns: 'common' });

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={() => onSave(draft)}
      isConfirmDisabled={!canSave || saving}
      title={
        editing
          ? t('galaxyEditorModal.editingValue1', { value1: editing.name })
          : t('galaxyEditorModal.newObjectValue1', {
              value1: draftKindLabel,
            })
      }
      description={t(galaxyKindDescriptionKeys[draft.kind])}
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            isDisabled={saving}
            onPress={() => onOpenChange(false)}
          >
            {t('galaxyEditorModal.cancel')}
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!canSave}
            onPress={() => onSave(draft)}
          >
            {t('galaxyEditorModal.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        {draft.kind === 'persona' || draft.kind === 'character' ? (
          <Surface className="rounded-2xl border border-separator p-3 sm:p-5 flex flex-col gap-1">
            <label className="min-w-0 text-sm font-medium">
              {t('identitySettings.avatar', { ns: 'profile' })}
            </label>
            <AvatarPicker
              value={galaxyInputAvatar(draft.data)}
              name={draft.name || draftKindLabel}
              showPreview
              description={t(
                'galaxyEditorModal.thePhotoAppearsInTheLibraryChatHeaderAndNext',
              )}
              disabled={saving}
              onChange={(avatar) =>
                setDraft({
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

        <Surface className="rounded-2xl border border-separator p-3 sm:p-5 bg-surface-secondary/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="galaxy-name">{t('galaxyEditorModal.name')}</Label>
              <Input
                id="galaxy-name"
                fullWidth
                variant="secondary"
                value={draft.name}
                placeholder={t('galaxyEditorModal.objectName')}
                autoFocus={autoFocus}
                autoComplete="off"
                maxLength={120}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="galaxy-description">
              {t('galaxyEditorModal.shortDescription')}
            </Label>
            <TextArea
              id="galaxy-description"
              fullWidth
              variant="secondary"
              rows={3}
              value={draft.description}
              placeholder={t(galaxyEditorDescriptionKeys[draft.kind])}
              autoComplete="off"
              className="min-h-20 sm:min-h-24"
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </div>
        </Surface>

        {draft.kind === 'persona' ? (
          <PersonaEditor
            data={draft.data as PersonaData}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'character' ? (
          <CharacterEditor
            data={draft.data as CharacterData}
            styles={styles}
            promptSets={promptSets}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'universe' ? (
          <UniverseEditor
            data={draft.data as UniverseData}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'worldbook' ? (
          <WorldbookEditor
            data={draft.data as WorldbookData}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'style' ? (
          <StyleEditor
            data={draft.data as StyleData}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}
        {draft.kind === 'prompt-set' ? (
          <PromptBuilder
            mode="set"
            value={draft.data as PromptSetData}
            onChange={(data) => setDraft({ ...draft, data })}
          />
        ) : null}

        <PromptPreviewCard
          input={promptPreviewFromDraft(draft, [...styles, ...promptSets])}
          title={t('galaxyEditorModal.currentPromptEstimate')}
        />

        {customStyleMissing ? (
          <p className="text-sm text-warning">
            {t('galaxyEditorModal.forACustomStyleSelectASavedPresetFromThe')}
          </p>
        ) : null}
        {error ? (
          <p className="selectable text-sm text-danger">{error}</p>
        ) : null}
      </div>
    </UiModal>
  );
}
