import { Button, Chip, Surface } from '@heroui/react';
import { MarkdownContent } from '../../../components/ui/MarkdownContent';
import { UiModal } from '../../../components/ui/UiModal';
import type { Message } from '../../../types';
import { formatMessageTime } from '../messageTime';
import { useTranslation } from 'react-i18next';

export function MessageHistoryModal({
  message,
  isWorking,
  onSelect,
  onClose,
}: {
  message: Message | null;
  isWorking: boolean;
  onSelect: (variantIndex: number) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('chats');
  return (
    <UiModal
      isOpen={message != null}
      onOpenChange={(open) => !open && !isWorking && onClose()}
      title={t('messageHistoryModal.responseHistory')}
      description={
        message
          ? t('messageHistoryModal.savedVariantsSummary', {
              value1: t('count.variant', {
                count: message.variants.length,
              }),
              value2: message.activeVariantIndex + 1,
            })
          : undefined
      }
      size="cover"
      bodyClassName="max-h-full"
      footer={
        <Button variant="ghost" isDisabled={isWorking} onPress={onClose}>
          {t('messageHistoryModal.close')}
        </Button>
      }
    >
      <div className="flex min-h-0 w-full max-w-full flex-col gap-3">
        {message?.variants.map((variant) => {
          const selected = variant.index === message.activeVariantIndex;
          return (
            <Surface
              key={variant.id}
              className="w-full max-w-full overflow-hidden rounded-2xl border border-separator p-3 sm:p-4"
            >
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-semibold">
                    {t('messageHistoryModal.response')} {variant.index + 1}
                  </span>
                  {selected ? (
                    <Chip
                      size="sm"
                      variant="soft"
                      className="bg-transparent text-accent"
                    >
                      {t('messageHistoryModal.selected')}
                    </Chip>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatMessageTime(
                    variant.createdAt,
                    i18n.resolvedLanguage ?? i18n.language,
                  )}
                </span>
              </div>
              <div className="selectable max-h-[min(28dvh,12rem)] overflow-y-auto overscroll-contain pr-1 text-sm">
                <MarkdownContent>{variant.content}</MarkdownContent>
              </div>
              {!selected ? (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  isDisabled={isWorking}
                  onPress={() => onSelect(variant.index)}
                >
                  {t('messageHistoryModal.selectThisResponse')}
                </Button>
              ) : null}
            </Surface>
          );
        })}
      </div>
    </UiModal>
  );
}
