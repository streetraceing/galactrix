import { Button, Surface } from '@heroui/react';
import type { RefObject } from 'react';
import { Icon } from '../../../components/Icon';
import type { Message, Provider } from '../../../types';

export function MessageList({
  messages,
  provider,
  providersAvailable,
  endRef,
}: {
  messages: Message[];
  provider?: Provider;
  providersAvailable: boolean;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <article
              key={message.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-default text-default-foreground">
                <Icon name={isUser ? 'user' : 'sparkles'} className="size-4" />
              </span>
              <div
                className={`min-w-0 max-w-[min(88%,44rem)] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}
              >
                <div
                  className={`mb-1 flex items-center gap-2 text-xs text-muted ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <strong className="font-medium text-foreground">
                    {isUser
                      ? 'Вы'
                      : message.role === 'assistant'
                        ? (provider?.name ?? 'Ассистент')
                        : 'Система'}
                  </strong>
                  <span>{message.createdAt}</span>
                </div>
                <Surface
                  variant={isUser ? 'tertiary' : 'secondary'}
                  className="selectable whitespace-pre-wrap wrap-break-word rounded-2xl px-4 py-3 text-sm leading-6"
                >
                  {message.content}
                </Surface>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  onPress={() =>
                    void navigator.clipboard.writeText(message.content)
                  }
                >
                  <Icon name="copy" className="size-3.5" /> Копировать
                </Button>
              </div>
            </article>
          );
        })}

        {messages.length === 0 ? (
          <div className="grid min-h-[50vh] place-items-center text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Icon name="chats" className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Начните разговор</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                {providersAvailable
                  ? provider
                    ? `Сообщения будут отправляться через ${provider.name}.`
                    : 'Выберите провайдера в заголовке, затем напишите сообщение.'
                  : 'Сначала добавьте провайдера во вкладке «Телескоп».'}
              </p>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </div>
  );
}
