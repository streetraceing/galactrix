import { Button } from '@heroui/react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { UiModal } from '../../../components/ui/UiModal';
import { errorMessage } from '../../../lib/errors';
import type { Message } from '../../../types';
import { copyChatText } from '../chatClipboard';

type TranslateMessageModalProps = {
  message: Message | null;
  targetLanguage: string;
  onTranslate: (messageId: string, targetLanguage: string) => Promise<string>;
  onClose: () => void;
};

export function TranslateMessageModal(props: TranslateMessageModalProps) {
  if (!props.message) return null;
  return (
    <TranslationDialog
      key={JSON.stringify([
        props.message.id,
        props.message.content,
        props.targetLanguage,
      ])}
      {...props}
      message={props.message}
    />
  );
}

function TranslationDialog({
  message,
  targetLanguage,
  onTranslate,
  onClose,
}: TranslateMessageModalProps & { message: Message }) {
  const { t } = useTranslation('chats');
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ detail: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const requestRef = useRef(0);
  const pendingRef = useRef(true);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);
  const originalId = useId();
  const translatedId = useId();
  const messageId = message.id;

  useEffect(() => {
    if (dismissed) return;
    const request = ++requestRef.current;
    let active = true;
    const isCurrent = () => active && request === requestRef.current;
    pendingRef.current = true;
    setLoading(true);
    setTranslated(null);
    setCopyError(null);
    // Dismissal only ignores this response; the provider request may continue.
    void (async () => {
      try {
        const text = await onTranslate(messageId, targetLanguage);
        if (!isCurrent()) return;
        if (!text.trim()) {
          setFailure({ detail: '' });
          return;
        }
        setTranslated(text);
        setFailure(null);
      } catch (caught) {
        if (isCurrent()) setFailure({ detail: errorMessage(caught) });
      } finally {
        if (isCurrent()) {
          pendingRef.current = false;
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      requestRef.current += 1;
    };
  }, [messageId, targetLanguage, onTranslate, attempt, dismissed]);

  const dismiss = () => {
    requestRef.current += 1;
    pendingRef.current = false;
    setDismissed(true);
    onClose();
  };

  const retry = () => {
    if (pendingRef.current || dismissed) return;
    pendingRef.current = true;
    setLoading(true);
    setAttempt((current) => current + 1);
  };

  const copy = async () => {
    if (!translated || copyingRef.current || dismissed) return;
    const request = requestRef.current;
    copyingRef.current = true;
    setCopying(true);
    setCopyError(null);
    try {
      await copyChatText(translated, t('translateModal.copied'));
    } catch (caught) {
      if (request === requestRef.current) {
        setCopyError(
          `${t('toast.copyFailed', { ns: 'common' })}: ${errorMessage(caught)}`,
        );
      }
    } finally {
      copyingRef.current = false;
      if (request === requestRef.current) setCopying(false);
    }
  };

  return (
    <UiModal
      isOpen={!dismissed}
      onOpenChange={(open) => !open && dismiss()}
      title={t('translateModal.title')}
      size="lg"
      footer={
        <>
          {translated ? (
            <Button
              variant="secondary"
              className="min-h-[44px]!"
              isPending={copying}
              isDisabled={copying}
              onPress={() => void copy()}
            >
              <Icon name="copy" className="size-4" />
              {t('translateModal.copy')}
            </Button>
          ) : null}
          <Button variant="ghost" className="min-h-[44px]!" onPress={dismiss}>
            {t('translateModal.close')}
          </Button>
        </>
      }
    >
      <div className="min-w-0 space-y-4">
        <div>
          <p
            id={originalId}
            className="text-xs font-medium uppercase tracking-wide text-muted"
          >
            {t('translateModal.original')}
          </p>
          <p
            tabIndex={0}
            aria-labelledby={originalId}
            className="mt-1.5 max-h-[min(30dvh,16rem)] select-text overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-xl bg-default/45 px-3 py-2.5 text-sm leading-6 text-muted outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {message.content}
          </p>
        </div>
        <div>
          <p
            id={translatedId}
            className="text-xs font-medium uppercase tracking-wide text-muted"
          >
            {t('translateModal.translated')}
          </p>
          <div role="status" aria-live="polite" aria-atomic="true">
            {loading ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-default/45 px-3 py-2.5 text-sm text-muted">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                />
                {t('translateModal.loading')}
              </div>
            ) : translated ? (
              <span className="sr-only">{t('translateModal.translated')}</span>
            ) : null}
          </div>
          <div aria-busy={loading}>
            {translated ? (
              <p
                tabIndex={0}
                aria-labelledby={translatedId}
                className="mt-1.5 max-h-[min(30dvh,16rem)] select-text overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-xl bg-accent/10 px-3 py-2.5 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {translated}
              </p>
            ) : null}
          </div>
          {failure ? (
            <div className="mt-2 space-y-2">
              <p role="alert" className="break-words text-sm text-danger">
                {t('translateModal.failed')}
                {failure.detail ? `: ${failure.detail}` : ''}
              </p>
              <Button
                variant="secondary"
                className="min-h-[44px] w-full sm:w-auto"
                isDisabled={loading}
                onPress={retry}
              >
                {t('actions.retry', { ns: 'common' })}
              </Button>
            </div>
          ) : null}
        </div>
        {copyError ? (
          <p role="alert" className="break-words text-sm text-danger">
            {copyError}
          </p>
        ) : null}
      </div>
    </UiModal>
  );
}
