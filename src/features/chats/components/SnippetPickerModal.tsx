import { Button, SearchField } from '@heroui/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { UiModal } from '../../../components/ui/UiModal';
import type { PromptSnippet } from '../../../types';

export function SnippetPickerModal({
  isOpen,
  snippets,
  onPick,
  onClose,
}: {
  isOpen: boolean;
  snippets: PromptSnippet[];
  onPick: (snippet: PromptSnippet) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const [query, setQuery] = useState('');
  const deferredQuery = query.trim().toLocaleLowerCase();

  const filtered = useMemo(
    () =>
      snippets.filter(
        (snippet) =>
          !deferredQuery ||
          snippet.title.toLocaleLowerCase().includes(deferredQuery) ||
          snippet.content.toLocaleLowerCase().includes(deferredQuery),
      ),
    [deferredQuery, snippets],
  );

  const pick = (snippet: PromptSnippet) => {
    onPick(snippet);
    setQuery('');
    onClose();
  };

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t('chatComposer.snippetsTitle')}
      description={t('chatComposer.snippetsDescription')}
      size="lg"
      footer={
        <Button variant="ghost" onPress={onClose}>
          {t('chatComposer.snippetsClose')}
        </Button>
      }
    >
      <div className="space-y-3">
        {snippets.length > 3 ? (
          <SearchField
            fullWidth
            variant="secondary"
            value={query}
            onChange={setQuery}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                autoComplete="off"
                placeholder={t('chatComposer.snippetsSearch')}
                aria-label={t('chatComposer.snippetsSearch')}
              />
              <SearchField.ClearButton
                aria-label={t('chatSidebar.clearSearch')}
              />
            </SearchField.Group>
          </SearchField>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon="book"
            title={t('chatComposer.snippetsEmptyTitle')}
            description={t('chatComposer.snippetsEmptyDescription')}
          />
        ) : (
          <div className="grid gap-2">
            {filtered.map((snippet) => (
              <button
                key={snippet.id}
                type="button"
                onClick={() => pick(snippet)}
                className="min-h-14 w-full cursor-pointer rounded-2xl border border-separator p-3 text-left outline-none transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex items-center justify-between gap-3">
                  <strong className="min-w-0 truncate text-sm font-semibold">
                    {snippet.title}
                  </strong>
                  <Icon name="insert" className="size-4 shrink-0 text-accent" />
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">
                  {snippet.content}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </UiModal>
  );
}
