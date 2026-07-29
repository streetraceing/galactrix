import { Button, Surface, TextArea, Tooltip } from '@heroui/react';
import { useMemo, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { toast } from '../../../i18n/toast';
import { i18next } from '../../../i18n';
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
import { useTranslation } from 'react-i18next';

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
    toast.success(i18next.t('copy.messageSuccess', { ns: 'chats' }));
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

  if (!copied) {
    throw new Error(i18next.t('errors.clipboardUnavailable', { ns: 'chats' }));
  }
  toast.success(i18next.t('copy.messageSuccess', { ns: 'chats' }));
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
  const { t } = useTranslation('chats');
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
          {isAssistant
            ? t('messageList.assistantResponse')
            : t('chatComposer.label')}
        </ContextMenuLabel>
        {isAssistant ? (
          <>
            <ContextMenuItem
              onClick={() => run(() => onRegenerate(message.id))}
            >
              <Icon name="regenerate" className="size-4 text-accent" />
              {t('messageList.regenerate')}
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Icon name="history" className="size-4" />
                {t('messageHistoryModal.responseHistory')}
                <span className="ml-auto mr-1 text-xs tabular-nums text-muted">
                  {message.activeVariantIndex + 1}/{message.variants.length}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-72">
                <ContextMenuLabel>
                  {t('messageList.savedVariants')}
                </ContextMenuLabel>
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
                  {t('messageList.openFullHistory')}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onClick={() => run(() => onBranch(message.id))}>
          <Icon name="branch" className="size-4" />
          {t('messageList.branchFromHere')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => run(() => copyText(message.content))}>
          <Icon name="copy" className="size-4" />
          {t('messageList.copy')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onEditRequest}>
          <Icon name="edit" className="size-4" />
          {t('messageList.edit')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => run(() => onRemember(message.id, !message.remembered))}
        >
          <Icon name="memory" className="size-4" />
          {message.remembered
            ? t('messageList.forget')
            : t('messageList.remember')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Icon name="trash" className="size-4" />
          {t('chatDialogs.delete')}
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
  const { t } = useTranslation('chats');
  const count = message.variants.length;
  if (message.role !== 'assistant' || count === 0) return null;
  const activePosition = getActiveVariantPosition(message);
  const previousVariant = message.variants[activePosition - 1];
  const nextVariant = message.variants[activePosition + 1];
  const isLastVariant = !nextVariant;

  if (compact) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[0.65rem] text-muted">
        <span className="inline-flex items-center gap-0.5">
          <Icon
            name={isLastVariant ? 'regenerate' : 'chevron-left'}
            className="size-3"
          />
          {t('messageList.swipeLeft')}
          {activePosition > 0 ? (
            <Icon name="chevron-right" className="size-3" />
          ) : null}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 min-w-0 px-2 text-xs text-muted"
          aria-label={t('messageList.openResponseHistory')}
          onPress={onHistory}
        >
          {activePosition + 1}/{count}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip delay={700} closeDelay={75}>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="size-7 min-w-7"
            aria-label={t('messageList.previousResponseVariant')}
            isDisabled={!previousVariant}
            onPress={() => {
              if (previousVariant) onSelect(previousVariant.index);
            }}
          >
            <Icon name="chevron-left" className="size-3.5" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{t('messageList.previousVariant')}</Tooltip.Content>
      </Tooltip>
      <Tooltip delay={700} closeDelay={75}>
        <Tooltip.Trigger>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 min-w-14 px-2 text-xs tabular-nums text-muted"
            aria-label={t('messageList.openResponseHistory')}
            onPress={onHistory}
          >
            {activePosition + 1}/{count}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{t('messageList.variantHistory')}</Tooltip.Content>
      </Tooltip>
      <Tooltip delay={700} closeDelay={75}>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="size-7 min-w-7"
            aria-label={
              isLastVariant
                ? t('messageList.generateANewResponseVariant')
                : t('messageList.nextResponseVariant')
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
        </Tooltip.Trigger>
        <Tooltip.Content>
          {isLastVariant
            ? t('messageList.newResponseVariant')
            : t('messageList.nextVariant')}
        </Tooltip.Content>
      </Tooltip>
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
  const { t } = useTranslation('chats');
  const run = (action: () => Promise<void>) => {
    onError('');
    void action().catch((error) => onError(String(error)));
  };
  const actions = [
    ...(message.role === 'assistant'
      ? [
          {
            label: t('messageList.regenerateResponse'),
            icon: 'regenerate' as const,
            onPress: () => run(() => onRegenerate(message.id)),
          },
          {
            label: t('messageHistoryModal.responseHistory'),
            icon: 'history' as const,
            onPress: onHistoryRequest,
          },
        ]
      : []),
    {
      label: t('messageList.branchChatFromThisMessage'),
      icon: 'branch' as const,
      onPress: () => run(() => onBranch(message.id)),
    },
    {
      label: t('messageList.copyMessage'),
      icon: 'copy' as const,
      onPress: () => run(() => copyText(message.content)),
    },
    {
      label: t('messageList.editMessage'),
      icon: 'edit' as const,
      onPress: onEditRequest,
    },
    {
      label: message.remembered
        ? t('messageList.removeFromMemory')
        : t('messageList.rememberMessage'),
      icon: 'memory' as const,
      onPress: () => run(() => onRemember(message.id, !message.remembered)),
    },
    {
      label: t('messageList.deleteMessage'),
      icon: 'trash' as const,
      onPress: onDeleteRequest,
      danger: true,
    },
  ];

  return (
    <div className="mt-1 flex min-h-7 w-full items-center justify-between gap-3">
      <div className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        {actions.map((action) => (
          <Tooltip key={action.label} delay={700} closeDelay={75}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className={`size-7 min-w-7 ${action.danger ? 'text-danger' : ''}`}
                aria-label={action.label}
                onPress={action.onPress}
              >
                <Icon name={action.icon} className="size-3.5" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{action.label}</Tooltip.Content>
          </Tooltip>
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
  onRegenerate,
  onError,
}: {
  message: Message;
  children: ReactNode;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation('chats');
  const pointerStart = useRef<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const selectingVariant = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [switching, setSwitching] = useState(false);

  const resetPointer = () => {
    pointerStart.current = null;
  };

  const settle = () => {
    setDragging(false);
    setDragOffset(0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'touch' ||
      message.role !== 'assistant' ||
      message.variants.length === 0 ||
      selectingVariant.current ||
      switching
    ) {
      return;
    }

    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId || selectingVariant.current) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) return;

    const activePosition = getActiveVariantPosition(message);
    const hasTarget =
      dx < 0 ? true : Boolean(message.variants[activePosition - 1]);
    const resistance = hasTarget ? 0.58 : 0.16;
    setDragOffset(Math.max(-88, Math.min(88, dx * resistance)));
  };

  const onPointerUp = async (event: ReactPointerEvent<HTMLDivElement>) => {
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
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) {
      settle();
      return;
    }

    const activePosition = getActiveVariantPosition(message);
    const nextPosition = dx < 0 ? activePosition + 1 : activePosition - 1;
    const nextVariant = message.variants[nextPosition];
    const shouldRegenerate = dx < 0 && !nextVariant;
    if (!nextVariant && !shouldRegenerate) {
      settle();
      return;
    }

    selectingVariant.current = true;
    setDragging(false);
    setSwitching(true);
    const direction = Math.sign(dx);
    setDragOffset(direction * 88);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 110));
      if (shouldRegenerate) {
        await onRegenerate(message.id);
      } else if (nextVariant) {
        await onSelectVariant(message.id, nextVariant.index);
      }
      setDragging(true);
      setDragOffset(direction * -56);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setDragging(false);
          setDragOffset(0);
          setSwitching(false);
        });
      });
    } catch (error) {
      onError(String(error));
      settle();
      setSwitching(false);
    } finally {
      selectingVariant.current = false;
    }
  };

  const cancelPointer = () => {
    resetPointer();
    settle();
  };

  const activePosition = getActiveVariantPosition(message);
  const revealPosition =
    dragOffset < 0 ? activePosition + 1 : activePosition - 1;
  const revealVariant = message.variants[revealPosition];
  const revealsRegeneration = dragOffset < 0 && !revealVariant;
  const revealProgress = Math.min(Math.abs(dragOffset) / 56, 1);

  return (
    <div
      className="relative touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelPointer}
      onLostPointerCapture={resetPointer}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 z-0 flex items-center gap-1 text-xs font-medium text-accent ${
          dragOffset > 0 ? 'left-1' : 'right-1 flex-row-reverse'
        }`}
        style={{
          opacity:
            revealVariant || revealsRegeneration
              ? revealProgress
              : revealProgress * 0.35,
          transform: `scale(${0.85 + revealProgress * 0.15})`,
        }}
        aria-hidden="true"
      >
        <Icon
          name={
            revealsRegeneration
              ? 'regenerate'
              : dragOffset < 0
                ? 'chevron-right'
                : 'chevron-left'
          }
          className="size-4"
        />
        <span>
          {revealVariant
            ? `${revealPosition + 1}/${message.variants.length}`
            : revealsRegeneration
              ? t('messageList.newResponse')
              : t('messageList.edge')}
        </span>
      </div>
      <div
        className={`${dragging ? '' : 'transition-[transform,opacity] duration-[var(--motion-standard)] ease-[var(--motion-ease)]'} relative z-10`}
        style={{
          opacity: switching ? 0.72 : 1 - revealProgress * 0.08,
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          willChange: dragOffset || switching ? 'transform, opacity' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  provider,
  assistantName,
  assistantAvatar,
  userName,
  userAvatar,
  pendingMessage,
  sending,
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
  assistantAvatar?: string;
  userName: string;
  userAvatar?: string;
  pendingMessage: string;
  sending: boolean;
  providersAvailable: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [editing, setEditing] = useState<Message | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [historyMessageId, setHistoryMessageId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);
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

  const regenerate = async (messageId: string) => {
    if (regeneratingMessageId) return;
    setRegeneratingMessageId(messageId);
    setError('');
    try {
      await onRegenerate(messageId);
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5 sm:px-5"
      >
        <div className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const displayName = isUser
              ? userName
              : message.role === 'assistant'
                ? assistantName
                : t('messageList.system');
            const avatar = isUser
              ? userAvatar
              : message.role === 'assistant'
                ? assistantAvatar
                : undefined;
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
                onRegenerate={regenerate}
                onSelectVariant={onSelectVariant}
                onEditRequest={edit}
                onDeleteRequest={remove}
                onHistoryRequest={history}
                onError={reportError}
              >
                <article
                  className={`message-enter group flex items-start gap-2.5 sm:gap-3 ${
                    regeneratingMessageId === message.id
                      ? 'message-regenerating'
                      : ''
                  } ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <AppAvatar
                    src={avatar}
                    name={displayName}
                    className={`size-8 sm:size-9`}
                    square
                  />
                  <div
                    className={`flex min-w-0 flex-col ${isUser ? 'items-end max-w-[min(91%,44rem)] sm:max-w-[min(88%,44rem)]' : 'w-full items-start'}`}
                  >
                    <div
                      className={`mb-1 flex min-w-0 items-center gap-2 text-xs text-muted ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      <strong className="truncate font-medium text-foreground">
                        {displayName}
                      </strong>
                      <span className="shrink-0">{message.createdAt}</span>
                      {message.remembered ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-accent">
                          <Icon name="memory" className="size-3" />
                          {t('messageList.remembered')}
                        </span>
                      ) : null}
                    </div>
                    <Surface
                      variant={isUser ? 'tertiary' : 'default'}
                      className={`${isMobile ? 'select-none' : 'selectable'} min-w-0 max-w-full overflow-hidden rounded-2xl border px-4 py-3 shadow-xs ${
                        isUser
                          ? 'border-accent/10 bg-accent/10'
                          : 'border-separator'
                      }`}
                    >
                      <div
                        key={`${message.activeVariantIndex}-${message.content}`}
                        className="message-variant-enter"
                      >
                        <MarkdownContent>{message.content}</MarkdownContent>
                      </div>
                    </Surface>
                    {!isMobile ? (
                      <DesktopMessageActions
                        message={message}
                        onBranch={onBranch}
                        onRemember={onRemember}
                        onRegenerate={regenerate}
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
                onRegenerate={regenerate}
                onError={reportError}
              >
                {content}
              </SwipeableMessage>
            ) : (
              <div key={message.id}>{content}</div>
            );
          })}

          {pendingMessage ? (
            <article className="message-enter flex flex-row-reverse items-start gap-2.5 opacity-75 sm:gap-3">
              <AppAvatar
                src={userAvatar}
                name={userName}
                className="size-8 sm:size-9"
                square
              />
              <div className="flex min-w-0 w-full flex-col items-end">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <span>{t('messageList.sending')}</span>
                  <strong className="font-medium text-foreground">
                    {userName}
                  </strong>
                </div>
                <Surface
                  variant="tertiary"
                  className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-accent/10 bg-accent/10 px-4 py-3 shadow-xs"
                >
                  <MarkdownContent>{pendingMessage}</MarkdownContent>
                </Surface>
              </div>
            </article>
          ) : null}

          {sending ? (
            <article className="message-enter flex items-start gap-2.5 sm:gap-3">
              <AppAvatar
                src={assistantAvatar}
                name={assistantName}
                className="size-8 sm:size-9"
                square
              />
              <div className="flex flex-col items-start">
                <span className="mb-1 text-xs font-medium text-muted">
                  {assistantName} {t('messageList.isTyping')}
                </span>
                <Surface className="flex h-11 items-center gap-1 rounded-2xl border border-separator px-4">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="typing-dot size-1.5 rounded-full bg-accent"
                      style={{ animationDelay: `${index * 140}ms` }}
                    />
                  ))}
                </Surface>
              </div>
            </article>
          ) : null}

          {messages.length === 0 && !pendingMessage && !sending ? (
            <div className="grid min-h-[50vh] place-items-center text-center">
              <div className="max-w-md">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Icon name="chats" className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">
                  {t('messageList.startTheConversation')}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {providersAvailable
                    ? provider
                      ? t('messageList.providerReady', {
                          value1: provider.name,
                        })
                      : t('messageList.openChatSettingsAndSelectAProvider')
                    : t('messageList.firstAddAProviderInTelescope')}
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
        title={t('messageList.editMessage')}
        description={
          editing?.role === 'assistant'
            ? t('messageList.theEditedTextWillBeSavedAsANewResponse')
            : t('messageList.theChangeAppliesToTheCurrentConversationHistory')
        }
        size={isMobile ? 'full' : 'cover'}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setEditing(null)}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="primary"
              isPending={working}
              isDisabled={!editValue.trim()}
              onPress={() => void commitEdit()}
            >
              {t('chatDialogs.save')}
            </Button>
          </>
        }
      >
        <TextArea
          autoComplete="off"
          fullWidth
          variant="secondary"
          value={editValue}
          className="[&_textarea]:min-h-72 h-full"
          aria-label={t('messageList.messageText')}
          onChange={(event) => setEditValue(event.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </UiModal>

      <UiModal
        isOpen={Boolean(deleting)}
        onOpenChange={(open) => !open && !working && setDeleting(null)}
        title={t('messageList.deleteMessage2')}
        description={t(
          'messageList.theMessageAndItsEntireVariantHistoryWillBeRemoved',
        )}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setDeleting(null)}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="danger"
              isPending={working}
              onPress={() => void commitDelete()}
            >
              {t('chatDialogs.delete')}
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
