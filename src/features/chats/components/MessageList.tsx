import { Button, Surface, TextArea } from '@heroui/react';
import { useMemo, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';
import { Icon } from '../../../components/Icon';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { MarkdownContent } from '../../../components/ui/MarkdownContent';
import { UiModal } from '../../../components/ui/UiModal';
import { isMobilePlatform } from '../../../lib/platform';
import type { Message, Provider } from '../../../types';
import { MessageHistoryModal } from './MessageHistoryModal';

type MessageActionProps = {
  message: Message;
  onBranch: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
  onEditRequest: () => void;
  onDeleteRequest: () => void;
  onHistoryRequest: () => void;
  onError: (message: string) => void;
};

async function copyText(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) throw new Error('Буфер обмена недоступен');
}

function MessageMenu({
  message,
  children,
  onBranch,
  onEditRequest,
  onDeleteRequest,
  onRemember,
  onRegenerate,
  onSelectVariant,
  onHistoryRequest,
  onError,
}: MessageActionProps & { children: ReactNode }) {
  const run = (action: () => Promise<void>) => {
    onError('');
    void action().catch((error) => onError(String(error)));
  };
  const isAssistant = message.role === 'assistant';

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block min-w-0">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel>
          {isAssistant ? 'Ответ ассистента' : 'Сообщение'}
        </ContextMenuLabel>
        {isAssistant ? (
          <>
            <ContextMenuItem
              onClick={() => run(() => onRegenerate(message.id))}
            >
              <Icon name="regenerate" className="size-4 text-accent" />
              Перегенерировать
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Icon name="history" className="size-4" />
                История ответов
                <span className="ml-auto mr-1 text-xs tabular-nums text-muted">
                  {message.activeVariantIndex + 1}/{message.variants.length}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-72">
                <ContextMenuLabel>Сохранённые варианты</ContextMenuLabel>
                {message.variants.map((variant) => (
                  <ContextMenuItem
                    key={variant.id}
                    onClick={() =>
                      run(() => onSelectVariant(message.id, variant.index))
                    }
                  >
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted">
                      {variant.index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {variant.content.replace(/\s+/g, ' ').trim()}
                    </span>
                    {variant.index === message.activeVariantIndex ? (
                      <Icon
                        name="check"
                        className="size-4 shrink-0 text-accent"
                      />
                    ) : null}
                  </ContextMenuItem>
                ))}
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onHistoryRequest}>
                  <Icon name="history" className="size-4" />
                  Открыть полную историю
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onClick={() => run(() => onBranch(message.id))}>
          <Icon name="branch" className="size-4" />
          Ветка отсюда
        </ContextMenuItem>
        <ContextMenuItem onClick={() => run(() => copyText(message.content))}>
          <Icon name="copy" className="size-4" />
          Копировать
        </ContextMenuItem>
        <ContextMenuItem onClick={onEditRequest}>
          <Icon name="edit" className="size-4" />
          Редактировать
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => run(() => onRemember(message.id, !message.remembered))}
        >
          <Icon name="memory" className="size-4" />
          {message.remembered ? 'Не запоминать' : 'Запомнить'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Icon name="trash" className="size-4" />
          Удалить
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function getActiveVariantPosition(message: Message) {
  const byIndex = message.variants.findIndex(
    (variant) => variant.index === message.activeVariantIndex,
  );
  if (byIndex >= 0) return byIndex;

  const byContent = message.variants.findIndex(
    (variant) => variant.content === message.content,
  );
  if (byContent >= 0) return byContent;

  return Math.max(0, message.variants.length - 1);
}

function VariantNavigator({
  message,
  compact = false,
  onSelect,
  onHistory,
  onRegenerate,
}: {
  message: Message;
  compact?: boolean;
  onSelect: (index: number) => void;
  onHistory: () => void;
  onRegenerate?: () => void;
}) {
  const count = message.variants.length;
  if (message.role !== 'assistant' || count === 0) return null;
  const activePosition = getActiveVariantPosition(message);
  const previousVariant = message.variants[activePosition - 1];
  const nextVariant = message.variants[activePosition + 1];
  const isLastVariant = !nextVariant;

  if (compact) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-6 min-w-0 px-2 text-xs text-muted"
        aria-label="Открыть историю ответов"
        onPress={onHistory}
      >
        {activePosition + 1}/{count}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="size-7 min-w-7"
        aria-label="Предыдущий вариант ответа"
        isDisabled={!previousVariant}
        onPress={() => {
          if (previousVariant) onSelect(previousVariant.index);
        }}
      >
        <Icon name="chevron-left" className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 min-w-14 px-2 text-xs tabular-nums text-muted"
        aria-label="Открыть историю ответов"
        onPress={onHistory}
      >
        {activePosition + 1}/{count}
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="size-7 min-w-7"
        aria-label={
          isLastVariant
            ? 'Сгенерировать новый вариант ответа'
            : 'Следующий вариант ответа'
        }
        isDisabled={isLastVariant && !onRegenerate}
        onPress={() =>
          isLastVariant
            ? onRegenerate?.()
            : nextVariant && onSelect(nextVariant.index)
        }
      >
        <Icon name="chevron-right" className="size-3.5" />
      </Button>
    </div>
  );
}

function DesktopMessageActions({
  message,
  onBranch,
  onEditRequest,
  onDeleteRequest,
  onRemember,
  onRegenerate,
  onSelectVariant,
  onHistoryRequest,
  onError,
}: MessageActionProps) {
  const run = (action: () => Promise<void>) => {
    onError('');
    void action().catch((error) => onError(String(error)));
  };
  const actions = [
    ...(message.role === 'assistant'
      ? [
          {
            label: 'Перегенерировать ответ',
            icon: 'regenerate' as const,
            onPress: () => run(() => onRegenerate(message.id)),
          },
          {
            label: 'История ответов',
            icon: 'history' as const,
            onPress: onHistoryRequest,
          },
        ]
      : []),
    {
      label: 'Разветвить чат с этого сообщения',
      icon: 'branch' as const,
      onPress: () => run(() => onBranch(message.id)),
    },
    {
      label: 'Копировать сообщение',
      icon: 'copy' as const,
      onPress: () => run(() => copyText(message.content)),
    },
    {
      label: 'Редактировать сообщение',
      icon: 'edit' as const,
      onPress: onEditRequest,
    },
    {
      label: message.remembered ? 'Убрать из памяти' : 'Запомнить сообщение',
      icon: 'memory' as const,
      onPress: () => run(() => onRemember(message.id, !message.remembered)),
    },
    {
      label: 'Удалить сообщение',
      icon: 'trash' as const,
      onPress: onDeleteRequest,
      danger: true,
    },
  ];

  return (
    <div className="mt-1 flex min-h-7 w-full items-center justify-between gap-3">
      <div className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        {actions.map((action) => (
          <Button
            key={action.label}
            isIconOnly
            size="sm"
            variant="ghost"
            className={`size-7 min-w-7 ${action.danger ? 'text-danger' : ''}`}
            aria-label={action.label}
            onPress={action.onPress}
          >
            <Icon name={action.icon} className="size-3.5" />
          </Button>
        ))}
      </div>
      <VariantNavigator
        message={message}
        onSelect={(index) => run(() => onSelectVariant(message.id, index))}
        onHistory={onHistoryRequest}
        onRegenerate={() => run(() => onRegenerate(message.id))}
      />
    </div>
  );
}

function SwipeableMessage({
  message,
  children,
  onSelectVariant,
  onError,
}: {
  message: Message;
  children: ReactNode;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
  onError: (message: string) => void;
}) {
  const pointerStart = useRef<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const selectingVariant = useRef(false);

  const resetPointer = () => {
    pointerStart.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'touch' ||
      message.role !== 'assistant' ||
      message.variants.length < 2
    ) {
      return;
    }

    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    resetPointer();
    if (!start || start.id !== event.pointerId || selectingVariant.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

    const activePosition = getActiveVariantPosition(message);
    const nextPosition = dx > 0 ? activePosition - 1 : activePosition + 1;
    const nextVariant = message.variants[nextPosition];
    if (!nextVariant) return;

    selectingVariant.current = true;
    void onSelectVariant(message.id, nextVariant.index)
      .catch((error) => onError(String(error)))
      .finally(() => {
        selectingVariant.current = false;
      });
  };

  return (
    <div
      className="touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={resetPointer}
      onLostPointerCapture={resetPointer}
    >
      {children}
    </div>
  );
}

export function MessageList({
  messages,
  provider,
  assistantName,
  providersAvailable,
  scrollRef,
  onBranch,
  onEdit,
  onDelete,
  onRemember,
  onRegenerate,
  onSelectVariant,
}: {
  messages: Message[];
  provider?: Provider;
  assistantName: string;
  providersAvailable: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
}) {
  const isMobile = isMobilePlatform();
  const [editing, setEditing] = useState<Message | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [historyMessageId, setHistoryMessageId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const historyMessage = useMemo(
    () => messages.find((message) => message.id === historyMessageId) ?? null,
    [historyMessageId, messages],
  );

  const requestEdit = (message: Message) => {
    setError('');
    setEditing(message);
    setEditValue(message.content);
  };

  const commitEdit = async () => {
    const value = editValue.trim();
    if (!editing || !value || working) return;
    setWorking(true);
    setError('');
    try {
      await onEdit(editing.id, value);
      setEditing(null);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setWorking(false);
    }
  };

  const commitDelete = async () => {
    if (!deleting || working) return;
    setWorking(true);
    setError('');
    try {
      await onDelete(deleting.id);
      setDeleting(null);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setWorking(false);
    }
  };

  const selectHistoryVariant = async (variantIndex: number) => {
    if (!historyMessage || working) return;
    setWorking(true);
    setError('');
    try {
      await onSelectVariant(historyMessage.id, variantIndex);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const edit = () => requestEdit(message);
            const remove = () => {
              setError('');
              setDeleting(message);
            };
            const history = () => setHistoryMessageId(message.id);
            const reportError = (value: string) => setError(value);

            const content = (
              <MessageMenu
                message={message}
                onBranch={onBranch}
                onRemember={onRemember}
                onRegenerate={onRegenerate}
                onSelectVariant={onSelectVariant}
                onEditRequest={edit}
                onDeleteRequest={remove}
                onHistoryRequest={history}
                onError={reportError}
              >
                <article
                  className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-default text-default-foreground">
                    <Icon
                      name={isUser ? 'user' : 'sparkles'}
                      className="size-4"
                    />
                  </span>
                  <div
                    className={`flex min-w-0 max-w-[min(88%,44rem)] flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`mb-1 flex min-w-0 items-center gap-2 text-xs text-muted ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      <strong className="truncate font-medium text-foreground">
                        {isUser
                          ? 'Вы'
                          : message.role === 'assistant'
                            ? assistantName
                            : 'Система'}
                      </strong>
                      <span className="shrink-0">{message.createdAt}</span>
                      {message.remembered ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-accent">
                          <Icon name="memory" className="size-3" />В памяти
                        </span>
                      ) : null}
                    </div>
                    <Surface
                      variant={isUser ? 'tertiary' : 'default'}
                      className={`${isMobile ? 'select-none' : 'selectable'} min-w-0 max-w-full overflow-hidden rounded-2xl px-4 py-3`}
                    >
                      <MarkdownContent>{message.content}</MarkdownContent>
                    </Surface>
                    {!isMobile ? (
                      <DesktopMessageActions
                        message={message}
                        onBranch={onBranch}
                        onRemember={onRemember}
                        onRegenerate={onRegenerate}
                        onSelectVariant={onSelectVariant}
                        onEditRequest={edit}
                        onDeleteRequest={remove}
                        onHistoryRequest={history}
                        onError={reportError}
                      />
                    ) : (
                      <VariantNavigator
                        message={message}
                        compact
                        onSelect={(index) =>
                          void onSelectVariant(message.id, index)
                        }
                        onHistory={history}
                      />
                    )}
                  </div>
                </article>
              </MessageMenu>
            );

            return isMobile ? (
              <SwipeableMessage
                key={message.id}
                message={message}
                onSelectVariant={onSelectVariant}
                onError={reportError}
              >
                {content}
              </SwipeableMessage>
            ) : (
              <div key={message.id}>{content}</div>
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
                      : 'Откройте настройки чата и выберите провайдера.'
                    : 'Сначала добавьте провайдера во вкладке «Телескоп».'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error && !editing && !deleting ? (
        <p className="shrink-0 border-t border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <UiModal
        isOpen={Boolean(editing)}
        onOpenChange={(open) => !open && !working && setEditing(null)}
        title="Редактировать сообщение"
        description={
          editing?.role === 'assistant'
            ? 'Изменённый текст сохранится как новый вариант ответа.'
            : 'Изменение применяется к текущей истории диалога.'
        }
        size={isMobile ? 'full' : 'cover'}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setEditing(null)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={working}
              isDisabled={!editValue.trim()}
              onPress={() => void commitEdit()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <TextArea
          fullWidth
          variant="secondary"
          value={editValue}
          className="[&_textarea]:min-h-72 h-full"
          aria-label="Текст сообщения"
          onChange={(event) => setEditValue(event.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </UiModal>

      <UiModal
        isOpen={Boolean(deleting)}
        onOpenChange={(open) => !open && !working && setDeleting(null)}
        title="Удалить сообщение?"
        description="Сообщение и вся история его вариантов исчезнут из этого чата."
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setDeleting(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={() => void commitDelete()}
            >
              Удалить
            </Button>
          </>
        }
      >
        <p className="line-clamp-6 text-sm leading-6 text-muted">
          {deleting?.content}
        </p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </UiModal>

      <MessageHistoryModal
        message={historyMessage}
        isWorking={working}
        onSelect={(variantIndex) => void selectHistoryVariant(variantIndex)}
        onClose={() => setHistoryMessageId(null)}
      />
    </>
  );
}
