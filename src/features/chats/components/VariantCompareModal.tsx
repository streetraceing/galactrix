import { Button, TextArea } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { MarkdownContent } from '../../../components/ui/MarkdownContent';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import type { Message } from '../../../types';

const MAX_RATING = 5;

type CompareSlot = 'left' | 'right';

function stepIndex(index: number, count: number, step: 1 | -1): number {
  if (count === 0) return 0;
  return (index + step + count) % count;
}

function VariantPane({
  side,
  message,
  variantIndex,
  draftNote,
  busy,
  onDraftNoteChange,
  onCycle,
  onRate,
  onNoteCommit,
  onPromote,
}: {
  side: CompareSlot;
  message: Message;
  variantIndex: number;
  draftNote: string;
  busy: boolean;
  onDraftNoteChange: (index: number, note: string) => void;
  onCycle: (side: CompareSlot, step: 1 | -1) => void;
  onRate: (index: number, rating: number | null) => void;
  onNoteCommit: (index: number) => void;
  onPromote: (index: number) => void;
}) {
  const { t } = useTranslation('chats');
  const count = message.variants.length;
  const variant = message.variants[variantIndex];
  if (!variant) return null;
  const isActive = variant.index === message.activeVariantIndex;
  const note = draftNote.trim() === '' ? (variant.note ?? '') : draftNote;

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-separator p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {side === 'left' ? 'A' : 'B'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="size-8 min-w-8"
            aria-label={t('compareModal.previousVariant')}
            isDisabled={busy || count < 2}
            onPress={() => onCycle(side, -1)}
          >
            <Icon name="chevron-left" className="size-4" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted">
            {variantIndex + 1}/{count}
          </span>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="size-8 min-w-8"
            aria-label={t('compareModal.nextVariant')}
            isDisabled={busy || count < 2}
            onPress={() => onCycle(side, 1)}
          >
            <Icon name="chevron" className="size-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-[min(40dvh,20rem)] min-h-24 overflow-y-auto overscroll-contain rounded-xl bg-default/45 px-3 py-2.5 sm:max-h-[min(48dvh,24rem)]">
        <MarkdownContent>{variant.content}</MarkdownContent>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: MAX_RATING }, (_, star) => star + 1).map(
          (value) => {
            const active = variant.rating != null && variant.rating >= value;
            return (
              <button
                key={value}
                type="button"
                disabled={busy}
                aria-label={t('compareModal.rate', { value })}
                className={`cursor-pointer rounded-lg p-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default ${
                  active ? 'text-warning' : 'text-default hover:text-warning'
                }`}
                onClick={() => onRate(variant.index, value)}
              >
                <Icon
                  name="star"
                  className={`size-5 ${active ? 'fill-current' : ''}`}
                />
              </button>
            );
          },
        )}
        {variant.rating != null ? (
          <button
            type="button"
            disabled={busy}
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2 text-xs text-muted outline-none hover:text-danger focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
            onClick={() => onRate(variant.index, null)}
          >
            {t('compareModal.clearRating')}
          </button>
        ) : null}
      </div>
      <TextArea
        aria-label={t('compareModal.notePlaceholder')}
        autoComplete="off"
        fullWidth
        variant="secondary"
        rows={2}
        value={note}
        placeholder={t('compareModal.notePlaceholder')}
        onChange={(event) =>
          onDraftNoteChange(variant.index, event.target.value)
        }
        onBlur={() => onNoteCommit(variant.index)}
      />
      <Button
        variant={isActive ? 'secondary' : 'primary'}
        fullWidth
        isDisabled={busy || isActive}
        onPress={() => onPromote(variant.index)}
      >
        <Icon name="check" className="size-4" />
        {isActive
          ? t('compareModal.currentResponse')
          : t('compareModal.promote')}
      </Button>
    </div>
  );
}

export function VariantCompareModal({
  message,
  working,
  onRate,
  onPromote,
  onClose,
}: {
  message: Message | null;
  working: boolean;
  onRate: (
    messageId: string,
    variantIndex: number,
    rating: number | null,
    note: string | null,
  ) => Promise<void>;
  onPromote: (messageId: string, variantIndex: number) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('chats');
  const count = message?.variants.length ?? 0;
  const [slots, setSlots] = useState<{ left: number; right: number }>({
    left: 0,
    right: 1,
  });
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const messageId = message?.id ?? null;
  useEffect(() => {
    if (!message) return;
    const active = message.activeVariantIndex;
    const other = message.variants.findIndex(
      (variant) => variant.index !== active,
    );
    setSlots({ left: active, right: other >= 0 ? other : active });
    setDraftNotes({});
  }, [messageId]);

  const busy = saving || working;

  const cycle = (side: CompareSlot, step: 1 | -1) => {
    if (!message || count < 2) return;
    setSlots((current) => {
      const next = stepIndex(current[side], count, step);
      if (next === current[side === 'left' ? 'right' : 'left']) {
        // Swap the panes so both sides always show different variants.
        return side === 'left'
          ? { left: next, right: current.left }
          : { left: current.right, right: next };
      }
      return { ...current, [side]: next };
    });
  };

  const run = async (action: () => Promise<void>) => {
    if (busy || !message) return;
    setSaving(true);
    try {
      await action();
    } catch (error) {
      toast.danger(t('errors.chatActionFailed'), {
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const effectiveNote = (index: number): string => {
    const variant = message?.variants[index];
    return draftNotes[index] ?? variant?.note ?? '';
  };

  const commitNote = (index: number) => {
    if (!message) return;
    const variant = message.variants[index];
    if (!variant) return;
    const note = effectiveNote(index).trim();
    if (note === (variant.note ?? '').trim()) return;
    void run(() =>
      onRate(message.id, index, variant.rating ?? null, note || null),
    );
  };

  return (
    <UiModal
      isOpen={message != null}
      onOpenChange={(open) => !open && !busy && onClose()}
      title={t('compareModal.title')}
      description={
        message
          ? t('compareModal.description', {
              count: message.variants.length,
            })
          : undefined
      }
      size="cover"
      bodyClassName="max-h-full"
      footer={
        <Button variant="ghost" isDisabled={busy} onPress={onClose}>
          {t('compareModal.close')}
        </Button>
      }
    >
      {message ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['left', 'right'] as const).map((side) => {
            const index = slots[side];
            const variant = message.variants[index];
            if (!variant) return null;
            return (
              <VariantPane
                key={side}
                side={side}
                message={message}
                variantIndex={index}
                draftNote={draftNotes[index] ?? ''}
                busy={busy}
                onDraftNoteChange={(noteIndex, note) =>
                  setDraftNotes((current) => ({
                    ...current,
                    [noteIndex]: note,
                  }))
                }
                onCycle={cycle}
                onRate={(rateIndex, rating) =>
                  void run(() =>
                    onRate(
                      message.id,
                      rateIndex,
                      rating,
                      effectiveNote(rateIndex).trim() || null,
                    ),
                  )
                }
                onNoteCommit={commitNote}
                onPromote={(promoteIndex) =>
                  void run(() => onPromote(message.id, promoteIndex))
                }
              />
            );
          })}
        </div>
      ) : null}
    </UiModal>
  );
}
