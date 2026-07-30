import { Button, Chip, Surface } from '@heroui/react';
import { MarkdownContent } from '../../../components/ui/MarkdownContent';
import { UiModal } from '../../../components/ui/UiModal';
import type { Message } from '../../../types';
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
  const { t } = useTranslation('chats');
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
      footer={
        <Button variant="ghost" isDisabled={isWorking} onPress={onClose}>
          {t('messageHistoryModal.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {message?.variants.map((variant) => {
          const selected = variant.index === message.activeVariantIndex;
          return (
            <Surface
              key={variant.id}
              className="rounded-2xl border border-separator p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
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
                  {variant.createdAt}
                </span>
              </div>
              <div className="selectable max-h-56 overflow-y-auto pr-1 text-sm">
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
