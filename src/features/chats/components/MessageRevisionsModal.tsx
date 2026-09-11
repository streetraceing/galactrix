import { Button } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EntityRevisionsList,
  type EntityRevisionRow,
} from '../../../components/ui/EntityRevisionsList';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import type { TranslationKey } from '../../../i18n';
import { errorMessage } from '../../../lib/errors';
import type { EntityRevision, Message } from '../../../types';

const REVISION_BADGE_KEYS: Record<string, TranslationKey<'common'>> = {
  edit: 'revisions.badge.edit',
  import: 'revisions.badge.import',
  restore: 'revisions.badge.restore',
};

function firstLine(content: string): string {
  const line = content
    .split('\n')
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  const normalized = line ?? content.trim();
  return normalized.length > 72 ? `${normalized.slice(0, 72)}…` : normalized;
}

export function MessageRevisionsModal({
  message,
  working,
  onList,
  onRestore,
  onClose,
}: {
  message: Message | null;
  working: boolean;
  onList: (messageId: string) => Promise<EntityRevision[]>;
  onRestore: (messageId: string, revisionId: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation(['chats', 'common']);
  const [rows, setRows] = useState<EntityRevisionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const messageId = message?.id ?? null;

  const load = useCallback(async () => {
    if (!messageId) return;
    setLoading(true);
    try {
      const revisions = await onList(messageId);
      setRows(
        revisions.map((revision) => {
          const content = String(revision.payload.content ?? '');
          const title = firstLine(content);
          return {
            id: revision.id,
            createdAt: revision.createdAt,
            badgeLabel: t(
              REVISION_BADGE_KEYS[revision.origin] ?? 'revisions.badge.edit',
              { ns: 'common' },
            ),
            title,
            preview:
              content.trim() === title
                ? undefined
                : content.trim() || undefined,
          };
        }),
      );
    } catch (error) {
      toast.danger(t('revisions.loadFailed', { ns: 'common' }), {
        description: errorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [messageId, onList, t]);

  useEffect(() => {
    if (!messageId) {
      setRows([]);
      return;
    }
    void load();
  }, [messageId, load]);

  const restore = async (revisionId: string) => {
    if (!messageId) return;
    await onRestore(messageId, revisionId);
    toast.success(t('revisions.restored', { ns: 'common' }));
    await load();
  };

  return (
    <UiModal
      isOpen={message != null}
      onOpenChange={(open) => !open && !loading && !working && onClose()}
      title={t('revisions.title', { ns: 'common' })}
      size="cover"
      bodyClassName="max-h-full"
      footer={
        <Button
          variant="ghost"
          isDisabled={loading || working}
          onPress={onClose}
        >
          {t('compareModal.close')}
        </Button>
      }
    >
      <div className="max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain">
        <EntityRevisionsList
          rows={rows}
          busy={loading || working}
          restoreLabel={t('revisions.restore', { ns: 'common' })}
          confirmTitle={t('revisions.confirmTitle', { ns: 'common' })}
          confirmLabel={t('revisions.confirm', { ns: 'common' })}
          cancelLabel={t('revisions.cancel', { ns: 'common' })}
          emptyLabel={t('revisions.empty', { ns: 'common' })}
          onRestore={(revisionId) => restore(revisionId)}
        />
      </div>
    </UiModal>
  );
}
