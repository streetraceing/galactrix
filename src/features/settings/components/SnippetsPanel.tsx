import { Button, Input, TextArea } from '@heroui/react';
import { useState } from 'react';
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

  const snippets = settings.snippets;

  const persist = async (next: PromptSnippet[], successMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onChangeSettings({ ...settings, snippets: next });
      toast.success(successMessage);
    } catch (caught) {
      toast.danger(t('snippets.saveFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () =>
    setEditor({ id: createRuleId(), title: '', content: '' });

  const openEdit = (snippet: PromptSnippet) => setEditor({ ...snippet });

  const commitEditor = async () => {
    if (!editor || busy) return;
    const title = editor.title.trim();
    const content = editor.content.trim();
    if (!title || !content) return;
    const existing = snippets.find((snippet) => snippet.id === editor.id);
    const next = existing
      ? snippets.map((snippet) =>
          snippet.id === editor.id ? { ...snippet, title, content } : snippet,
        )
      : [...snippets, { id: editor.id, title, content }];
    setEditor(null);
    await persist(
      next,
      existing ? t('snippets.updated') : t('snippets.created', { title }),
    );
  };

  const removeSnippet = async (snippetId: string) => {
    setDeletingId(null);
    await persist(
      snippets.filter((snippet) => snippet.id !== snippetId),
      t('snippets.deleted'),
    );
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
            <Button variant="primary" onPress={openCreate} isDisabled={busy}>
              <Icon name="plus" className="size-4" />
              {t('snippets.add')}
            </Button>
          }
        />

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
                  <strong className="min-w-0 truncate text-sm font-semibold">
                    {snippet.title}
                  </strong>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="size-8 min-w-8"
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
                      className="size-8 min-w-8"
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
                      className="size-8 min-w-8"
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
                      className="size-8 min-w-8 text-danger"
                      aria-label={t('snippets.delete')}
                      isDisabled={busy}
                      onPress={() => setDeletingId(snippet.id)}
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
        onOpenChange={(open) => !open && !busy && setEditor(null)}
        onConfirm={() => void commitEditor()}
        isConfirmDisabled={
          busy ||
          !editor?.title.trim() ||
          !editor?.content.trim() ||
          editor.content.length > MAX_CONTENT_LENGTH
        }
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
              isDisabled={busy}
              onPress={() => setEditor(null)}
            >
              {t('snippets.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={busy}
              isDisabled={
                busy ||
                !editor?.title.trim() ||
                !editor?.content.trim() ||
                editor.content.length > MAX_CONTENT_LENGTH
              }
              onPress={() => void commitEditor()}
            >
              {t('snippets.save')}
            </Button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{t('snippets.nameField')}</p>
              <Input
                aria-label={t('snippets.nameField')}
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
              <p className="text-sm font-medium">
                {t('snippets.contentField')}
              </p>
              <TextArea
                aria-label={t('snippets.contentField')}
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
        onOpenChange={(open) => !open && !busy && setDeletingId(null)}
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
              isDisabled={busy}
              onPress={() => setDeletingId(null)}
            >
              {t('snippets.cancel')}
            </Button>
            <Button
              variant="danger"
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
      </UiModal>
    </div>
  );
}
