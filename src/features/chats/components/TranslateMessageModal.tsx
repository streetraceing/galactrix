import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import type { Message } from '../../../types';

export function TranslateMessageModal({
  message,
  targetLanguage,
  onTranslate,
  onClose,
}: {
  message: Message | null;
  targetLanguage: string;
  onTranslate: (messageId: string, targetLanguage: string) => Promise<string>;
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const messageId = message?.id ?? null;
  const content = message?.content ?? '';

  useEffect(() => {
    if (!messageId) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTranslated(null);
    onTranslate(messageId, targetLanguage)
      .then((text) => {
        if (!cancelled) setTranslated(text);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.danger(t('translateModal.failed'), {
            description: errorMessage(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [messageId, targetLanguage, onTranslate]);

  const copy = async () => {
    if (!translated) return;
    await navigator.clipboard.writeText(translated);
    toast.success(t('translateModal.copied'));
  };

  return (
    <UiModal
      isOpen={message != null}
      onOpenChange={(open) => !open && !loading && onClose()}
      title={t('translateModal.title')}
      size="lg"
      footer={
        <>
          {translated ? (
            <Button variant="secondary" autoFocus onPress={() => void copy()}>
              <Icon name="copy" className="size-4" />
              {t('translateModal.copy')}
            </Button>
          ) : null}
          <Button variant="ghost" isDisabled={loading} onPress={onClose}>
            {t('translateModal.close')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {content ? (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t('translateModal.original')}
              </p>
              <p className="mt-1.5 max-h-[min(30dvh,16rem)] overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-xl bg-default/45 px-3 py-2.5 text-sm leading-6 text-muted">
                {content}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t('translateModal.translated')}
              </p>
              {loading ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-default/45 px-3 py-2.5 text-sm text-muted">
                  <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('translateModal.loading')}
                </div>
              ) : translated ? (
                <p className="mt-1.5 max-h-[min(30dvh,16rem)] overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-xl bg-accent/10 px-3 py-2.5 text-sm leading-6 text-foreground">
                  {translated}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </UiModal>
  );
}
