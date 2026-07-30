import { Surface, TextArea } from '@heroui/react';
import { memo, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { TooltipIconButton } from '../../../components/ui/TooltipIconButton';
import type { Provider } from '../../../types';
import { useTranslation } from 'react-i18next';
import { draftKey } from '../utils';

function readDraft(chatId: string, saveDrafts: boolean) {
  return saveDrafts ? (localStorage.getItem(draftKey(chatId)) ?? '') : '';
}

function persistDraft(chatId: string, value: string) {
  if (value) localStorage.setItem(draftKey(chatId), value);
  else localStorage.removeItem(draftKey(chatId));
}

function ChatComposerComponent({
  chatId,
  provider,
  sending,
  sendOnEnter,
  saveDrafts,
  shouldAutoFocus,
  focusKey,
  onSend,
}: {
  chatId: string;
  provider?: Provider;
  sending: boolean;
  sendOnEnter: boolean;
  saveDrafts: boolean;
  shouldAutoFocus: boolean;
  focusKey: string;
  onSend: (value: string) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
  const [draft, setDraft] = useState(() => readDraft(chatId, saveDrafts));
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  const submittingRef = useRef(false);
  const providerId = provider?.id;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(readDraft(chatId, saveDrafts));
  }, [chatId, saveDrafts]);

  useEffect(() => {
    if (!saveDrafts) {
      localStorage.removeItem(draftKey(chatId));
      return;
    }

    const timer = window.setTimeout(
      () => persistDraft(chatId, draftRef.current),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [chatId, draft, saveDrafts]);

  useEffect(
    () => () => {
      if (saveDrafts) persistDraft(chatId, draftRef.current);
    },
    [chatId, saveDrafts],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const textArea = textAreaRef.current;
      if (!textArea) return;
      textArea.style.height = 'auto';
      textArea.style.height = `${Math.min(textArea.scrollHeight, 192)}px`;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draft]);

  useEffect(() => {
    if (!shouldAutoFocus || !providerId || sending) return;

    const frame = window.requestAnimationFrame(() => {
      const textArea = textAreaRef.current;
      if (!textArea || textArea.disabled) return;
      textArea.focus({ preventScroll: true });
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusKey, providerId, sending, shouldAutoFocus]);

  const submit = async () => {
    const value = draft.trim();
    if (!value || !provider || sending || submittingRef.current) return;

    submittingRef.current = true;
    setDraft('');
    try {
      await onSend(value);
      localStorage.removeItem(draftKey(chatId));
    } catch {
      setDraft((current) => current || value);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <div className="shrink-0 border-t border-separator bg-background px-3 py-2 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        <Surface className="rounded-2xl border border-separator p-2 transition-[border-color,box-shadow]">
          <div className="flex items-end gap-2">
            <TextArea
              autoComplete="off"
              ref={textAreaRef}
              fullWidth
              variant="secondary"
              rows={1}
              value={draft}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setDraft(event.target.value)
              }
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                const sendWithShortcut =
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.altKey &&
                  !event.getModifierState('AltGraph') &&
                  !event.nativeEvent.isComposing &&
                  (sendOnEnter || event.ctrlKey || event.metaKey);
                if (sendWithShortcut) {
                  event.preventDefault();
                  void submit();
                }
              }}
              enterKeyHint={sendOnEnter ? 'send' : 'enter'}
              placeholder={t('chatComposer.placeholder')}
              aria-label={t('chatComposer.label')}
              disabled={!provider || sending}
              className="max-h-48 min-h-12 resize-none overflow-y-auto transition-none ring-0"
            />
            <TooltipIconButton
              label={t('chatComposer.sendMessage')}
              size="lg"
              variant="primary"
              className="shrink-0"
              isDisabled={!draft.trim() || !provider || sending}
              isPending={sending}
              onPress={() => void submit()}
            >
              <Icon name="send" className="size-5" />
            </TooltipIconButton>
          </div>
          <div className="hidden flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-2 text-[0.7rem] text-muted sm:flex">
            <span>
              {provider
                ? `${provider.model} · max ${provider.maxTokens}`
                : t('chatComposer.usesConnectionSettings')}
            </span>
            <span>
              {sendOnEnter
                ? t('chatComposer.enterSend')
                : t('chatComposer.ctrlEnterSend')}
            </span>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export const ChatComposer = memo(ChatComposerComponent);
