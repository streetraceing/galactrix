import { Button, Input, TextArea } from '@heroui/react';
import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppPanel } from '../../../components/ui/AppPanel';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import type { AppSettings, PromptSnippet } from '../../../types';

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 12_000;

type EditorState = {
  id: string;
  title: string;
  content: string;
};

export function isSnippetDraftValid(editor: EditorState | null): boolean {
  return Boolean(
    editor?.title.trim() &&
    editor.content.trim() &&
    editor.title.length <= MAX_TITLE_LENGTH &&
    editor.content.length <= MAX_CONTENT_LENGTH,
  );
}

function createRuleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `snippet-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function moveItem<T>(items: T[], index: number, step: 1 | -1): T[] {
  const target = index + step;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function SnippetsPanel({
  settings,
  onChangeSettings,
}: {
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
}) {
  const { t } = useTranslation('settings');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleId = useId();
  const contentId = useId();
  const countId = useId();

  const snippets = settings.snippets;
  const canSave = isSnippetDraftValid(editor);

  const persist = async (
    next: PromptSnippet[],
    successMessage: string,
  ): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setSaveError(null);
    try {
      const saved = await onChangeSettings({ ...settings, snippets: next });
      if (!saved) {
        setSaveError(t('snippets.saveFailed'));
        return false;
      }
      toast.success(successMessage);
      return true;
    } catch (caught) {
      setSaveError(`${t('snippets.saveFailed')}: ${errorMessage(caught)}`);
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const openCreate = () => {
    if (busyRef.current) return;
    setSaveError(null);
    setEditor({ id: createRuleId(), title: '', content: '' });
  };

  const openEdit = (snippet: PromptSnippet) => {
    if (busyRef.current) return;
    setSaveError(null);
    setEditor({ ...snippet });
  };

  const commitEditor = async () => {
    if (!editor || busyRef.current || !isSnippetDraftValid(editor)) return;
    const title = editor.title.trim();
    const content = editor.content.trim();
    if (!title || !content) return;
    const existing = snippets.find((snippet) => snippet.id === editor.id);
    const next = existing
      ? snippets.map((snippet) =>
          snippet.id === editor.id ? { ...snippet, title, content } : snippet,
        )
      : [...snippets, { id: editor.id, title, content }];
    const saved = await persist(
      next,
      existing ? t('snippets.updated') : t('snippets.created', { title }),
    );
    if (saved) setEditor(null);
  };

  const removeSnippet = async (snippetId: string) => {
    const saved = await persist(
      snippets.filter((snippet) => snippet.id !== snippetId),
      t('snippets.deleted'),
    );
    if (saved) setDeletingId(null);
  };

  const reorder = async (index: number, step: 1 | -1) => {
    await persist(moveItem(snippets, index, step), t('snippets.reordered'));
  };

  return (
    <div className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
      <AppPanel className="p-4 sm:p-5">
        <SectionHeader
          title={t('snippets.title')}
          description={t('snippets.description')}
          actions={
            <Button
              variant="primary"
              className="min-h-[44px] w-full sm:w-auto"
              onPress={openCreate}
              isDisabled={busy}
            >
              <Icon name="plus" className="size-4" />
              {t('snippets.add')}
            </Button>
          }
        />

        {saveError && !editor && !deletingId ? (
          <p role="alert" className="mt-3 break-words text-sm text-danger">
            {saveError}
          </p>
        ) : null}
        {snippets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted">
            {t('snippets.empty')}
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {snippets.map((snippet, index) => (
              <div
                key={snippet.id}
                className="rounded-2xl border border-separator p-3"
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <strong className="min-w-0 max-w-full wrap-anywhere text-sm font-semibold">
                    {snippet.title}
                  </strong>
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="size-[44px] min-h-[44px] min-w-[44px]"
                      aria-label={t('snippets.moveUp')}
                      isDisabled={index === 0 || busy}
                      onPress={() => void reorder(index, -1)}
                    >
                      <Icon name="chevron" className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="size-[44px] min-h-[44px] min-w-[44px]"
                      aria-label={t('snippets.moveDown')}
                      isDisabled={index === snippets.length - 1 || busy}
                      onPress={() => void reorder(index, 1)}
                    >
                      <Icon name="chevron" className="size-4 rotate-180" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="size-[44px] min-h-[44px] min-w-[44px]"
                      aria-label={t('snippets.edit')}
                      isDisabled={busy}
                      onPress={() => openEdit(snippet)}
                    >
                      <Icon name="edit" className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="size-[44px] min-h-[44px] min-w-[44px] text-danger"
                      aria-label={t('snippets.delete')}
                      isDisabled={busy}
                      onPress={() => {
                        if (busyRef.current) return;
                        setSaveError(null);
                        setDeletingId(snippet.id);
                      }}
                    >
                      <Icon name="trash" className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {snippet.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </AppPanel>

      <UiModal
        isOpen={editor != null}
        onOpenChange={(open) => !open && !busyRef.current && setEditor(null)}
        onConfirm={() => void commitEditor()}
        isConfirmDisabled={busy || !canSave}
        title={
          editor && snippets.some((snippet) => snippet.id === editor.id)
            ? t('snippets.editTitle')
            : t('snippets.createTitle')
        }
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              className="min-h-[44px]!"
              isDisabled={busy}
              onPress={() => !busyRef.current && setEditor(null)}
            >
              {t('snippets.cancel')}
            </Button>
            <Button
              variant="primary"
              className="min-h-[44px]!"
              isPending={busy}
              isDisabled={busy || !canSave}
              onPress={() => void commitEditor()}
            >
              {t('snippets.save')}
            </Button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4" aria-busy={busy}>
            {saveError ? (
              <p role="alert" className="break-words text-sm text-danger">
                {saveError}
              </p>
            ) : null}
            <div>
              <label htmlFor={titleId} className="text-sm font-medium">
                {t('snippets.nameField')}
              </label>
              <Input
                id={titleId}
                disabled={busy}
                required
                autoComplete="off"
                fullWidth
                variant="secondary"
                value={editor.title}
                maxLength={MAX_TITLE_LENGTH}
                autoFocus
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEditor((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
              />
            </div>
            <div>
              <label htmlFor={contentId} className="text-sm font-medium">
                {t('snippets.contentField')}
              </label>
              <TextArea
                id={contentId}
                aria-describedby={countId}
                aria-invalid={editor.content.length > MAX_CONTENT_LENGTH}
                disabled={busy}
                required
                autoComplete="off"
                fullWidth
                variant="secondary"
                rows={6}
                value={editor.content}
                className="min-h-0 resize-none"
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, content: event.target.value }
                      : current,
                  )
                }
              />
              <p
                id={countId}
                className={`mt-1 text-xs ${
                  editor.content.length > MAX_CONTENT_LENGTH
                    ? 'text-danger'
                    : 'text-muted'
                }`}
              >
                {editor.content.length}/{MAX_CONTENT_LENGTH}
              </p>
            </div>
          </div>
        ) : null}
      </UiModal>

      <UiModal
        isOpen={deletingId != null}
        onOpenChange={(open) =>
          !open && !busyRef.current && setDeletingId(null)
        }
        onConfirm={() => {
          if (deletingId) void removeSnippet(deletingId);
        }}
        isConfirmDisabled={busy}
        title={t('snippets.deleteTitle')}
        description={t('snippets.deleteDescription')}
        footer={
          <>
            <Button
              variant="ghost"
              className="min-h-[44px]!"
              isDisabled={busy}
              onPress={() => !busyRef.current && setDeletingId(null)}
            >
              {t('snippets.cancel')}
            </Button>
            <Button
              variant="danger"
              className="min-h-[44px]!"
              isDisabled={busy}
              isPending={busy}
              onPress={() => {
                if (deletingId) void removeSnippet(deletingId);
              }}
            >
              {t('snippets.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('snippets.deleteWarning')}</p>
        {saveError ? (
          <p role="alert" className="mt-3 break-words text-sm text-danger">
            {saveError}
          </p>
        ) : null}
      </UiModal>
    </div>
  );
}
