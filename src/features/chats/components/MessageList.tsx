import { Button, Surface, TextArea } from '@heroui/react';
import { useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Icon } from '../../../components/Icon';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { MarkdownContent } from '../../../components/ui/MarkdownContent';
import { UiModal } from '../../../components/ui/UiModal';
import { isMobilePlatform } from '../../../lib/platform';
import type { Message, Provider } from '../../../types';

type MessageActionProps = {
  message: Message;
  onBranch: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onEditRequest: () => void;
  onDeleteRequest: () => void;
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
  onError,
}: MessageActionProps & { children: ReactNode }) {
  const run = (action: () => Promise<void>) => {
    onError('');
    void action().catch((error) => onError(String(error)));
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block min-w-0">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
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

function DesktopMessageActions({
  message,
  onBranch,
  onEditRequest,
  onDeleteRequest,
  onRemember,
  onError,
}: MessageActionProps) {
  const run = (action: () => Promise<void>) => {
    onError('');
    void action().catch((error) => onError(String(error)));
  };
  const actions = [
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
    <div className="mt-0.5 flex h-7 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {actions.map((action) => (
        <Button
          key={action.label}
          isIconOnly
          size="sm"
          variant="ghost"
          className={`size-7 min-w-7 ${action.danger ? 'text-danger' : ''}`}
          aria-label={action.label}
          title={action.label}
          onPress={action.onPress}
        >
          <Icon name={action.icon} className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}

export function MessageList({
  messages,
  provider,
  providersAvailable,
  scrollRef,
  onBranch,
  onEdit,
  onDelete,
  onRemember,
}: {
  messages: Message[];
  provider?: Provider;
  providersAvailable: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
}) {
  const isMobile = isMobilePlatform();
  const [editing, setEditing] = useState<Message | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

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
            const reportError = (value: string) => setError(value);

            return (
              <MessageMenu
                key={message.id}
                message={message}
                onBranch={onBranch}
                onRemember={onRemember}
                onEditRequest={edit}
                onDeleteRequest={remove}
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
                            ? (provider?.name ?? 'Ассистент')
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
                        onEditRequest={edit}
                        onDeleteRequest={remove}
                        onError={reportError}
                      />
                    ) : null}
                  </div>
                </article>
              </MessageMenu>
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
        description="Изменение применяется к текущей истории диалога."
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
          minRows={4}
          maxRows={12}
          aria-label="Текст сообщения"
          onChange={(event) => setEditValue(event.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </UiModal>

      <UiModal
        isOpen={Boolean(deleting)}
        onOpenChange={(open) => !open && !working && setDeleting(null)}
        title="Удалить сообщение?"
        description="Сообщение исчезнет из локальной истории этого чата."
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
        <p className="line-clamp-4 text-sm leading-6 text-muted">
          {deleting?.content}
        </p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </UiModal>
    </>
  );
}
