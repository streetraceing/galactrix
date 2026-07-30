import { Button, Surface, TextArea, Tooltip } from '@heroui/react';
import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Icon } from '../../../components/Icon';
import type { Provider } from '../../../types';
import { useTranslation } from 'react-i18next';

export function ChatComposer({
  draft,
  provider,
  sending,
  sendOnEnter,
  onDraftChange,
  onSend,
}: {
  draft: string;
  provider?: Provider;
  sending: boolean;
  sendOnEnter: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  const { t } = useTranslation('chats');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;
    textArea.style.height = 'auto';
    textArea.style.height = `${Math.min(textArea.scrollHeight, 192)}px`;
  }, [draft]);

  return (
    <div className="shrink-0 border-t border-separator bg-background/95 px-3 py-2 backdrop-blur sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        <Surface className="rounded-2xl border border-separator p-2">
          <div className="flex items-end gap-2">
            <TextArea
              autoComplete="off"
              ref={textAreaRef}
              fullWidth
              variant="secondary"
              rows={1}
              value={draft}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onDraftChange(event.target.value)
              }
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (sendOnEnter && event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              enterKeyHint={sendOnEnter ? 'send' : 'enter'}
              placeholder={t('chatComposer.placeholder')}
              aria-label={t('chatComposer.label')}
              disabled={!provider || sending}
              className="max-h-48 min-h-12 resize-none overflow-y-auto"
            />
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  size="lg"
                  variant="primary"
                  className="shrink-0"
                  isDisabled={!draft.trim() || !provider || sending}
                  isPending={sending}
                  aria-label={t('chatComposer.sendMessage')}
                  onPress={onSend}
                >
                  <Icon name="send" className="size-5" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('chatComposer.sendMessage')}</Tooltip.Content>
            </Tooltip>
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
                : t('chatComposer.sendWithButton')}
            </span>
          </div>
        </Surface>
      </div>
    </div>
  );
}
