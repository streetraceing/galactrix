import { Button, Input, Label, Surface, TextArea } from '@heroui/react';
import { useEffect, useState } from 'react';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import {
  EntityRevisionsList,
  type EntityRevisionRow,
} from '../../../components/ui/EntityRevisionsList';
import { Icon } from '../../../components/Icon';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import { copyChatText } from '../../chats/chatClipboard';
import { UiModal } from '../../../components/ui/UiModal';
import { PromptPreviewCard } from '../../../components/ui/PromptPreviewCard';
import { RequiredMark } from '../../../components/ui/RequiredMark';
import { PromptBuilder } from '../../chats/components/PromptBuilder';
import { promptPreviewFromDraft } from '../../chats/promptPreview';
import { galaxyInputAvatar, withAvatar } from '../../../lib/avatar';
import { isMobilePlatform } from '../../../lib/platform';
import type { TranslationKey } from '../../../i18n';
import type {
  CharacterData,
  EntityRevision,
  VariantFeedback,
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
import { TemplateVariablesHint } from './editors/TemplateVariablesHint';
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
  onListRevisions,
  onRestoreRevision,
  onListFeedback,
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
  onListRevisions?: () => Promise<EntityRevision[]>;
  onRestoreRevision?: (revisionId: string) => Promise<unknown>;
  onListFeedback?: () => Promise<VariantFeedback[]>;
}) {
  const autoFocus = !isMobilePlatform();
  const { t } = useTranslation(['galaxies', 'common']);
  const [draft, setDraft] = useState(initialDraft);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisionRows, setRevisionRows] = useState<EntityRevisionRow[]>([]);
  const [revisionsBusy, setRevisionsBusy] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hints, setHints] = useState<VariantFeedback[]>([]);
  const [hintsBusy, setHintsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) setDraft(initialDraft);
  }, [initialDraft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowRevisions(false);
      setShowHints(false);
    }
  }, [isOpen]);

  const revisionsBadgeKeys: Record<string, TranslationKey<'common'>> = {
    edit: 'revisions.badge.edit',
    import: 'revisions.badge.import',
    restore: 'revisions.badge.restore',
  };

  const toggleRevisions = async () => {
    if (!onListRevisions || !editing) return;
    if (showRevisions) {
      setShowRevisions(false);
      return;
    }
    setRevisionsBusy(true);
    try {
      const revisions = await onListRevisions();
      setRevisionRows(
        revisions.map((revision) => ({
          id: revision.id,
          createdAt: revision.createdAt,
          badgeLabel: t(
            revisionsBadgeKeys[revision.origin] ?? 'revisions.badge.edit',
            { ns: 'common' },
          ),
          title: String(revision.payload.name ?? editing.name),
          preview:
            String(
              revision.payload.description ?? editing.description,
            ).trim() || undefined,
        })),
      );
      setShowRevisions(true);
    } catch (caught) {
      toast.danger(t('revisions.loadFailed', { ns: 'common' }), {
        description: errorMessage(caught),
      });
    } finally {
      setRevisionsBusy(false);
    }
  };

  const toggleHints = async () => {
    if (!onListFeedback || !editing) return;
    if (showHints) {
      setShowHints(false);
      return;
    }
    setHintsBusy(true);
    try {
      setHints(await onListFeedback());
      setShowHints(true);
    } catch (caught) {
      toast.danger(t('hints.loadFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setHintsBusy(false);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!onRestoreRevision) return;
    try {
      await onRestoreRevision(revisionId);
      toast.success(t('revisions.restored', { ns: 'common' }));
      await toggleRevisions(); // close the list; the draft re-syncs from props
      setShowRevisions(false);
    } catch (caught) {
      toast.danger(t('errors.chatActionFailed', { ns: 'common' }), {
        description: errorMessage(caught),
      });
    }
  };

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
          {editing && onListRevisions ? (
            <Button
              variant={showRevisions ? 'secondary' : 'ghost'}
              className="w-full sm:w-auto"
              isPending={revisionsBusy}
              isDisabled={saving}
              onPress={() => void toggleRevisions()}
            >
              <Icon name="history" className="size-4" />
              {showRevisions
                ? t('galaxyEditorModal.backToEditor')
                : t('galaxyEditorModal.history')}
            </Button>
          ) : null}
          {editing && onListFeedback ? (
            <Button
              variant={showHints ? 'secondary' : 'ghost'}
              className="w-full sm:w-auto"
              isPending={hintsBusy}
              isDisabled={saving}
              onPress={() => void toggleHints()}
            >
              <Icon name="star" className="size-4" />
              {showHints
                ? t('galaxyEditorModal.backToEditor')
                : t('galaxyEditorModal.tuningHints')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className={
              editing && onListRevisions ? '' : 'hidden sm:inline-flex'
            }
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
      {showHints ? (
        <div className="max-h-[min(60dvh,36rem)] space-y-2.5 overflow-y-auto overscroll-contain">
          {hints.length === 0 ? (
            <p className="rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted">
              {t('hints.empty')}
            </p>
          ) : (
            hints.map((hint, index) => (
              <div
                key={`${hint.chatTitle}-${hint.createdAt}-${index}`}
                className="rounded-2xl border border-separator p-3"
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <strong className="min-w-0 truncate text-sm font-semibold">
                    {hint.chatTitle}
                  </strong>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {hint.rating != null ? (
                      <span className="flex items-center gap-0.5 text-warning">
                        <Icon name="star" className="size-3.5 fill-current" />
                        <span className="text-xs font-semibold">
                          {hint.rating}
                        </span>
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={t('hints.copy')}
                      className="cursor-pointer rounded-lg p-1.5 text-muted outline-none transition-colors hover:bg-surface hover:text-accent focus-visible:ring-2 focus-visible:ring-focus"
                      onClick={() => void copyChatText(hint.content)}
                    >
                      <Icon name="copy" className="size-4" />
                    </button>
                  </span>
                </div>
                {hint.note ? (
                  <p className="mt-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs leading-5 text-warning">
                    {hint.note}
                  </p>
                ) : null}
                <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-muted">
                  {hint.content}
                </p>
              </div>
            ))
          )}
        </div>
      ) : showRevisions ? (
        <div className="max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain">
          <EntityRevisionsList
            rows={revisionRows}
            busy={revisionsBusy || saving}
            restoreLabel={t('revisions.restore', { ns: 'common' })}
            confirmTitle={t('revisions.confirmTitle', { ns: 'common' })}
            confirmLabel={t('revisions.confirm', { ns: 'common' })}
            cancelLabel={t('revisions.cancel', { ns: 'common' })}
            emptyLabel={t('revisions.empty', { ns: 'common' })}
            onRestore={(revisionId) => restoreRevision(revisionId)}
          />
        </div>
      ) : (
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
                <Label htmlFor="galaxy-name">
                  {t('galaxyEditorModal.name')}
                  <RequiredMark />
                </Label>
                <Input
                  id="galaxy-name"
                  required
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
                className="min-h-28 sm:min-h-32"
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </div>
          </Surface>

          <TemplateVariablesHint />

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
      )}
    </UiModal>
  );
}
