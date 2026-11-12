import { Alert, Button } from '@heroui/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { UiModal } from '../../../components/ui/UiModal';
import { copyChatText } from '../chatClipboard';
import {
  isReportedGenerationError,
  sanitizeGenerationDetail,
  type GenerationFailure,
} from '../generationFailures';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';

export function GenerationFailureNotice({
  failure,
  canRetry,
  onRetry,
  onDismiss,
  onSettings,
  providerName,
  model,
}: {
  failure: GenerationFailure;
  canRetry: boolean;
  onRetry?: () => Promise<void>;
  onDismiss: () => void;
  onSettings?: () => void;
  providerName?: string;
  model?: string;
}) {
  const { t } = useTranslation('chats');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const diagnostic = sanitizeGenerationDetail(
    [
      providerName && `${t('generationFailure.provider')}: ${providerName}`,
      model && `${t('generationFailure.model')}: ${model}`,
      failure.status && `HTTP ${failure.status}`,
      failure.key,
      failure.details,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  const report = (error: unknown) => {
    if (!isReportedGenerationError(error))
      toast.danger(t('errors.chatActionFailed'), {
        description: errorMessage(error),
      });
  };
  const retry = async () => {
    if (inFlight.current || !canRetry || !onRetry) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await onRetry();
    } catch (error) {
      report(error);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <div className="max-h-[40dvh] shrink-0 overflow-y-auto px-3 py-2 sm:px-6">
        <Alert
          status="danger"
          role="alert"
          className="mx-auto w-full min-w-0 max-w-5xl"
        >
          <Alert.Indicator />
          <Alert.Content className="min-w-0 flex-1">
            <Alert.Title className="wrap-anywhere">
              {t(`generationFailure.${failure.kind}.title`)}
            </Alert.Title>
            <Alert.Description className="wrap-anywhere">
              {t(`generationFailure.${failure.kind}.hint`)}
            </Alert.Description>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              {canRetry && onRetry ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-10 min-w-0"
                  isDisabled={busy}
                  onPress={() => void retry()}
                >
                  <Icon name="refresh" className="size-4 shrink-0" />
                  {t('generationFailure.retry')}
                </Button>
              ) : null}
              {onSettings ? (
                <Button
                  size="sm"
                  variant="tertiary"
                  className="min-h-10 min-w-0"
                  onPress={onSettings}
                >
                  {t('generationFailure.settings')}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="tertiary"
                className="min-h-10 min-w-0"
                onPress={() => setDetailsOpen(true)}
              >
                {t('generationFailure.details')}
              </Button>
            </div>
          </Alert.Content>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            className="size-10 shrink-0"
            aria-label={t('generationFailure.dismiss')}
            onPress={onDismiss}
          >
            <Icon name="close" className="size-4" />
          </Button>
        </Alert>
      </div>
      <UiModal
        isOpen={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={t('generationFailure.details')}
        footer={
          <>
            <Button
              variant="secondary"
              onPress={() => {
                void copyChatText(diagnostic).catch(report);
              }}
            >
              <Icon name="copy" className="size-4" />
              {t('generationFailure.copy')}
            </Button>
            <Button variant="tertiary" onPress={() => setDetailsOpen(false)}>
              {t('generationFailure.close')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('generationFailure.retryHint')}</p>
        <pre className="selectable max-h-[45dvh] min-w-0 max-w-full overflow-y-auto whitespace-pre-wrap wrap-anywhere rounded-xl bg-default/40 p-3 text-xs">
          {diagnostic}
        </pre>
        <p className="text-xs text-muted">{t('generationFailure.privacy')}</p>
      </UiModal>
    </>
  );
}
