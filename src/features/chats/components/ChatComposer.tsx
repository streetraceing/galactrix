import { Button, Surface, TextArea } from '@heroui/react';
import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Icon } from '../../../components/Icon';
import type { Provider } from '../../../types';

export function ChatComposer({
  draft,
  provider,
  sending,
  sendOnEnter,
  error,
  onDraftChange,
  onSend,
}: {
  draft: string;
  provider?: Provider;
  sending: boolean;
  sendOnEnter: boolean;
  error: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
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
        {error ? (
          <p className="selectable mb-2 px-1 text-sm text-danger">{error}</p>
        ) : null}
        <Surface className="rounded-2xl border border-separator p-2">
          <div className="flex items-end gap-2">
            <TextArea
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
              placeholder={`Сообщение...`}
              aria-label="Сообщение"
              disabled={!provider || sending}
              className="max-h-48 min-h-12 resize-none overflow-y-auto"
            />
            <Button
              isIconOnly
              size="lg"
              variant="primary"
              className="shrink-0"
              isDisabled={!draft.trim() || !provider || sending}
              isPending={sending}
              aria-label="Отправить сообщение"
              onPress={onSend}
            >
              <Icon name="send" className="size-5" />
            </Button>
          </div>
          <div className="hidden flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-2 text-[0.7rem] text-muted sm:flex">
            <span>
              {provider
                ? `${provider.model} · max ${provider.maxTokens}`
                : 'Настройки берутся из подключения'}
            </span>
            <span>
              {sendOnEnter ? 'Enter - отправить' : 'Отправка кнопкой'}
            </span>
          </div>
        </Surface>
      </div>
    </div>
  );
}
