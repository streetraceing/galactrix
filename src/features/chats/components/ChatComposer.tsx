import { Button, Surface, TextArea } from '@heroui/react';
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
  providersAvailable: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-separator bg-background/95 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        {error ? (
          <p className="selectable mb-2 px-1 text-sm text-danger">{error}</p>
        ) : null}
        <Surface className="rounded-2xl border border-separator p-2">
          <div className="flex items-end gap-2">
            <TextArea
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
              placeholder={`Сообщение...`}
              disabled={!provider || sending}
              className="max-h-48 min-h-12 resize-y"
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-2 text-[0.7rem] text-muted">
            <span>
              {provider
                ? `${provider.model} · max ${provider.maxTokens}`
                : 'Настройки берутся из подключения'}
            </span>
            <span>
              {sendOnEnter ? 'Enter — отправить' : 'Отправка кнопкой'}
            </span>
          </div>
        </Surface>
      </div>
    </div>
  );
}
