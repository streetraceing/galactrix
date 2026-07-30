import { Button, Chip, Surface } from '@heroui/react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from '../../i18n/toast';
import { previewPrompt } from '../../lib/backend';
import type { PromptPreviewInput, PromptPreviewResult } from '../../types';
import { Icon } from '../Icon';
import { UiModal } from './UiModal';
import { useTranslation } from 'react-i18next';

export function PromptPreviewCard({
  input,
  title,
}: {
  input: PromptPreviewInput;
  title?: string;
}) {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('promptPreviewCard.promptEstimate');
  const [result, setResult] = useState<PromptPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const deferredInput = useDeferredValue(input);
  const serializedInput = useMemo(
    () => JSON.stringify(deferredInput),
    [deferredInput],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timeout = window.setTimeout(() => {
      void previewPrompt(JSON.parse(serializedInput) as PromptPreviewInput)
        .then((nextResult) => {
          if (active) setResult(nextResult);
        })
        .catch((caught) => {
          if (!active) return;
          setResult(null);
          setError(caught instanceof Error ? caught.message : String(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [serializedInput]);

  const copyPrompt = async () => {
    if (!result?.prompt) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(t('promptPreviewCard.clipboardIsUnavailable'));
      }
      await navigator.clipboard.writeText(result.prompt);
      toast.success(t('promptPreviewCard.promptCopied'));
    } catch (caught) {
      toast.danger(t('promptPreviewCard.couldNotCopyPrompt'), {
        description: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  return (
    <>
      <Surface className="rounded-2xl border border-separator bg-surface-secondary/50 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="database" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block break-words text-sm">
                {resolvedTitle}
              </strong>
              <span className="mt-0.5 block break-words text-xs leading-5 text-muted">
                {t('promptPreviewCard.resultAfterSubstitutingNamesFor')}
                {'{{user}}'} {t('promptPreviewCard.and')}
                {'{{char}}'}.
              </span>
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            isDisabled={!result?.prompt || loading}
            onPress={() => setPreviewOpen(true)}
          >
            <Icon name="info" className="size-4" />{' '}
            {t('promptPreviewCard.fullPrompt')}
          </Button>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Chip size="sm" variant="soft" color="accent">
            {loading
              ? t('promptPreviewCard.calculating')
              : `≈ ${t('count.token', {
                  count: result?.approximateTokens ?? 0,
                })}`}
          </Chip>
          <Chip size="sm" variant="soft">
            {t('count.character', { count: result?.characters ?? 0 })}
          </Chip>
        </div>
        {error ? (
          <p className="selectable mt-3 text-xs text-danger">{error}</p>
        ) : null}
      </Surface>

      <UiModal
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        title={t('promptPreviewCard.fullSystemPrompt')}
        description={t(
          'promptPreviewCard.thisIsTheExactSectionOrderTheModelReceivesVariables',
        )}
        size="cover"
        footer={
          <>
            <Button variant="ghost" onPress={() => setPreviewOpen(false)}>
              {t('promptPreviewCard.close')}
            </Button>
            <Button
              variant="primary"
              isDisabled={!result?.prompt}
              onPress={() => void copyPrompt()}
            >
              <Icon name="copy" className="size-4" />{' '}
              {t('promptPreviewCard.copy')}
            </Button>
          </>
        }
      >
        <pre className="selectable min-h-48 whitespace-pre-wrap break-words rounded-2xl border border-separator bg-default/50 p-4 font-mono text-xs leading-5">
          {result?.prompt ||
            t('promptPreviewCard.thereAreNoActiveSourcesInThePromptYet')}
        </pre>
      </UiModal>
    </>
  );
}
