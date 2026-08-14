import { Button, Chip } from '@heroui/react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from '../../i18n/toast';
import { previewPrompt } from '../../lib/backend';
import { errorMessage } from '../../lib/errors';
import type { PromptPreviewInput, PromptPreviewResult } from '../../types';
import { Icon } from '../Icon';
import { AppIconTile } from './AppIconTile';
import { AppPanel } from './AppPanel';
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
  const contribution = input.scope === 'contribution';
  const resolvedTitle =
    title ??
    t(
      contribution
        ? 'promptPreviewCard.contributionEstimate'
        : 'promptPreviewCard.promptEstimate',
    );
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
          setError(errorMessage(caught));
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
        description: errorMessage(caught),
      });
    }
  };

  return (
    <>
      <AppPanel emphasis="subtle" className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1">
            <AppIconTile icon="database" size="sm" className="size-9" />
            <span className="min-w-0 flex-1">
              <strong className="block wrap-break-word text-sm">
                {resolvedTitle}
              </strong>
              <span className="mt-0.5 block wrap-break-word text-xs leading-5 text-muted">
                {contribution
                  ? t('promptPreviewCard.contributionDescription')
                  : t('promptPreviewCard.requestDescription')}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap gap-2 justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
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
            {!contribution && (result?.savedApproximateTokens ?? 0) > 0 ? (
              <Chip
                size="sm"
                variant="soft"
                color="success"
                className="h-auto max-w-full whitespace-normal py-1"
              >
                <span className="max-w-full whitespace-normal text-center leading-4">
                  {t('promptPreviewCard.tokensSavedPercent', {
                    count: result?.savedApproximateTokens ?? 0,
                    percent: Math.round(
                      ((result?.savedApproximateTokens ?? 0) /
                        Math.max(result?.baselineApproximateTokens ?? 0, 1)) *
                        100,
                    ),
                  })}
                </span>
              </Chip>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="tertiary"
            className="w-full shrink-0 sm:w-auto"
            isDisabled={!result?.prompt || loading}
            onPress={() => setPreviewOpen(true)}
          >
            <Icon name="info" className="size-4" />{' '}
            {t(
              contribution
                ? 'promptPreviewCard.viewContribution'
                : 'promptPreviewCard.viewRequest',
            )}
          </Button>
        </div>
        {!contribution && (result?.runtimeVariableSections.length ?? 0) > 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted">
            {t('promptPreviewCard.runtimeModulesNotice')}
          </p>
        ) : null}
        {error ? (
          <p className="selectable mt-3 text-xs text-danger">{error}</p>
        ) : null}
      </AppPanel>

      <UiModal
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        title={t(
          contribution
            ? 'promptPreviewCard.promptContribution'
            : 'promptPreviewCard.baseModelRequest',
        )}
        description={t(
          contribution
            ? 'promptPreviewCard.contributionModalDescription'
            : 'promptPreviewCard.requestModalDescription',
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
        <pre className="selectable min-h-48 whitespace-pre-wrap wrap-break-word rounded-2xl border border-separator bg-default/50 p-4 font-mono text-xs leading-5">
          {result?.prompt ||
            t(
              contribution
                ? 'promptPreviewCard.noContributionYet'
                : 'promptPreviewCard.thereAreNoActiveSourcesInThePromptYet',
            )}
        </pre>
      </UiModal>
    </>
  );
}
