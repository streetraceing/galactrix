import { Button, Surface, TextArea, Tooltip } from '@heroui/react';
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {
  initialMessageWindowStart,
  previousMessageWindowStart,
} from '../messageWindow';

type MessageActionProps = {
  message: Message;
  onBranch: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
  onEditRequest: () => void;
  onDeleteRequest: () => void;
  onHistoryRequest: () => void;
  onError: (message: string) => void;
};

type VariantDirection = 'next' | 'previous';

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
  onContinue,
  onSelectVariant,
  onHistoryRequest,
  onError,
}: MessageActionProps & { children: ReactNode }) {
  const { t } = useTranslation('chats');
  const run = (action: () => Promise<void>) => {
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
            <ContextMenuItem onClick={() => run(() => onContinue(message.id))}>
              <Icon name="sparkles" className="size-4 text-accent" />
              {t('messageList.continueResponse')}
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

function AnimatedVariantContent({
  message,
  direction,
}: {
  message: Message;
  direction: VariantDirection;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const directionRef = useRef(direction);
  const previousVariantRef = useRef({
    index: message.activeVariantIndex,
    content: message.content,
  });

  directionRef.current = direction;

  useLayoutEffect(() => {
    const previous = previousVariantRef.current;
    if (
      previous.index === message.activeVariantIndex &&
      previous.content === message.content
    ) {
      return;
    }
    previousVariantRef.current = {
      index: message.activeVariantIndex,
      content: message.content,
    };

    const element = contentRef.current;
    animationRef.current?.cancel();
    animationRef.current = null;

    if (
      !element ||
      document.documentElement.dataset.animations === 'off' ||
      typeof element.animate !== 'function'
    ) {
      return;
    }

    const offset = directionRef.current === 'previous' ? -6 : 6;
    const animation = element.animate(
      [
        {
          opacity: 0.58,
          transform: `translate3d(${offset}px, 0, 0)`,
        },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: 150,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    );
    animationRef.current = animation;

    void animation.finished
      .catch(() => undefined)
      .finally(() => {
        if (animationRef.current === animation) animationRef.current = null;
      });

    return () => animation.cancel();
  }, [message.activeVariantIndex, message.content]);

  return (
    <div ref={contentRef}>
      <MarkdownContent>{message.content}</MarkdownContent>
    </div>
  );
}

function VariantNavigator({
  message,
  compact = false,
  onSelect,
  onHistory,
  onRegenerate,
  onContinue,
}: {
  message: Message;
  compact?: boolean;
  onSelect: (index: number) => void;
  onHistory: () => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
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
        {onContinue ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 min-w-0 gap-1 px-2 text-xs text-accent"
            aria-label={t('messageList.continueResponse')}
            onPress={onContinue}
          >
            <Icon name="sparkles" className="size-3.5" />
            {t('messageList.continueResponseShort')}
          </Button>
        ) : null}
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
  onContinue,
  onSelectVariant,
  onHistoryRequest,
  onError,
}: MessageActionProps) {
  const { t } = useTranslation('chats');
  const run = (action: () => Promise<void>) => {
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
            label: t('messageList.continueResponse'),
            icon: 'sparkles' as const,
            onPress: () => run(() => onContinue(message.id)),
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
    <div className="pointer-events-none mt-1 flex min-h-7 w-full translate-y-0.5 items-center justify-between gap-3 opacity-0 transition-[opacity,transform] duration-(--motion-fast) ease-(--motion-ease) group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
      <div className="flex items-center gap-0.5">
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
      selectingVariant.current
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
    setDragOffset(0);

    try {
      if (shouldRegenerate) {
        await onRegenerate(message.id);
      } else if (nextVariant) {
        await onSelectVariant(message.id, nextVariant.index);
      }
    } catch (error) {
      onError(String(error));
      settle();
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
        className={`${dragging ? '' : 'transition-[transform,opacity] duration-(--motion-standard) ease-(--motion-ease)'} relative z-10`}
        style={{
          opacity: 1 - revealProgress * 0.08,
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          willChange: dragOffset ? 'transform, opacity' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const VARIANT_SELECTION_LOCK_MS = 180;

function MessageEditModal({
  message,
  onClose,
  onEdit,
}: {
  message: Message | null;
  onClose: () => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [value, setValue] = useState(message?.content ?? '');
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const content = value.trim();
    if (!message || !content || saving) return;

    setSaving(true);
    try {
      await onEdit(message.id, content);
      onClose();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : String(error);
      if (description) {
        toast.danger(t('errors.chatActionFailed'), {
          description,
          timeout: 3_500,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiModal
      isOpen={Boolean(message)}
      onOpenChange={(open) => !open && !saving && onClose()}
      onConfirm={() => void commit()}
      isConfirmDisabled={!message || !value.trim() || saving}
      title={t('messageList.editMessage')}
      description={
        message?.role === 'assistant'
          ? t('messageList.theEditedTextWillBeSavedAsANewResponse')
          : t('messageList.theChangeAppliesToTheCurrentConversationHistory')
      }
      size={isMobile ? 'full' : 'cover'}
      footer={
        <>
          <Button variant="ghost" isDisabled={saving} onPress={onClose}>
            {t('chatDialogs.cancel')}
          </Button>
          <Button
            variant="primary"
            isPending={saving}
            isDisabled={!value.trim()}
            onPress={() => void commit()}
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
        value={value}
        className="[&_textarea]:min-h-72 h-full"
        aria-label={t('messageList.messageText')}
        onChange={(event) => setValue(event.target.value)}
      />
    </UiModal>
  );
}

function MessageListComponent({
  chatId,
  messages,
  provider,
  assistantName,
  assistantAvatar,
  userName,
  userAvatar,
  pendingMessage,
  sending,
  viewMode,
  showAvatars,
  showTimestamps,
  providersAvailable,
  scrollRef,
  onBranch,
  onEdit,
  onDelete,
  onRemember,
  onRegenerate,
  onContinue,
  onSelectVariant,
}: {
  chatId: string;
  messages: Message[];
  provider?: Provider;
  assistantName: string;
  assistantAvatar?: string;
  userName: string;
  userAvatar?: string;
  pendingMessage: string;
  sending: boolean;
  viewMode: 'conversation' | 'messenger';
  showAvatars: boolean;
  showTimestamps: boolean;
  providersAvailable: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [editing, setEditing] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [historyMessageId, setHistoryMessageId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [messageGeneration, setMessageGeneration] = useState<{
    messageId: string;
    mode: 'regenerate' | 'continue';
  } | null>(null);
  const messageGenerationRef = useRef<string | null>(null);
  const variantSelectionRef = useRef<string | null>(null);
  const pendingScrollRestoreRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const [messageWindow, setMessageWindow] = useState(() => ({
    chatId,
    start: initialMessageWindowStart(messages.length),
    expanded: false,
  }));
  const [variantDirections, setVariantDirections] = useState<
    Record<string, VariantDirection>
  >({});
  const messengerMode = viewMode === 'messenger';
  const visibleStart =
    messageWindow.chatId === chatId
      ? Math.min(messageWindow.start, messages.length)
      : initialMessageWindowStart(messages.length);
  const visibleMessages = useMemo(
    () => messages.slice(visibleStart),
    [messages, visibleStart],
  );

  useLayoutEffect(() => {
    if (messageWindow.chatId !== chatId) {
      pendingScrollRestoreRef.current = null;
      setEditing(null);
      setDeleting(null);
      setHistoryMessageId(null);
      setMessageGeneration(null);
      messageGenerationRef.current = null;
      variantSelectionRef.current = null;
      setVariantDirections({});
      setMessageWindow({
        chatId,
        start: initialMessageWindowStart(messages.length),
        expanded: false,
      });
      return;
    }

    if (!messageWindow.expanded) {
      const start = initialMessageWindowStart(messages.length);
      if (messageWindow.start !== start) {
        setMessageWindow((current) =>
          current.chatId === chatId ? { ...current, start } : current,
        );
      }
      return;
    }

    if (messageWindow.start > messages.length) {
      setMessageWindow((current) =>
        current.chatId === chatId
          ? { ...current, start: messages.length }
          : current,
      );
    }
  }, [chatId, messageWindow, messages.length]);

  useLayoutEffect(() => {
    const restore = pendingScrollRestoreRef.current;
    const scroller = scrollRef.current;
    if (!restore || !scroller) return;

    pendingScrollRestoreRef.current = null;
    scroller.scrollTop =
      restore.scrollTop + (scroller.scrollHeight - restore.scrollHeight);
  }, [scrollRef, visibleStart]);

  const loadEarlierMessages = useCallback(() => {
    if (visibleStart <= 0) return;

    const scroller = scrollRef.current;
    if (scroller) {
      pendingScrollRestoreRef.current = {
        scrollHeight: scroller.scrollHeight,
        scrollTop: scroller.scrollTop,
      };
    }
    setMessageWindow((current) => ({
      chatId,
      start: previousMessageWindowStart(
        current.chatId === chatId ? current.start : visibleStart,
      ),
      expanded: true,
    }));
  }, [chatId, scrollRef, visibleStart]);

  const historyMessage = useMemo(
    () => messages.find((message) => message.id === historyMessageId) ?? null,
    [historyMessageId, messages],
  );

  const requestEdit = (message: Message) => {
    setEditing(message);
  };

  const reportError = (error: unknown) => {
    const description = error instanceof Error ? error.message : String(error);
    if (!description) return;
    toast.danger(t('errors.chatActionFailed'), {
      description,
      timeout: 3_500,
    });
  };

  const selectVariant = async (messageId: string, variantIndex: number) => {
    if (variantSelectionRef.current) return;
    const message = messages.find((item) => item.id === messageId);
    if (!message || message.activeVariantIndex === variantIndex) return;

    const activePosition = getActiveVariantPosition(message);
    const nextPosition = message.variants.findIndex(
      (variant) => variant.index === variantIndex,
    );
    variantSelectionRef.current = messageId;
    setVariantDirections((current) => ({
      ...current,
      [messageId]: nextPosition < activePosition ? 'previous' : 'next',
    }));
    try {
      await onSelectVariant(messageId, variantIndex);
      await new Promise((resolve) =>
        window.setTimeout(resolve, VARIANT_SELECTION_LOCK_MS),
      );
    } finally {
      if (variantSelectionRef.current === messageId) {
        variantSelectionRef.current = null;
      }
    }
  };

  const commitDelete = async () => {
    if (!deleting || working) return;
    setWorking(true);
    try {
      await onDelete(deleting.id);
      setDeleting(null);
    } catch (nextError) {
      reportError(nextError);
    } finally {
      setWorking(false);
    }
  };

  const selectHistoryVariant = async (variantIndex: number) => {
    if (!historyMessage || working) return;
    setWorking(true);
    try {
      await selectVariant(historyMessage.id, variantIndex);
    } catch (nextError) {
      reportError(nextError);
    } finally {
      setWorking(false);
    }
  };

  const runMessageGeneration = async (
    messageId: string,
    mode: 'regenerate' | 'continue',
    action: (messageId: string) => Promise<void>,
  ) => {
    if (messageGenerationRef.current) return;
    messageGenerationRef.current = messageId;
    setMessageGeneration({ messageId, mode });
    setVariantDirections((current) => ({
      ...current,
      [messageId]: 'next',
    }));
    try {
      await action(messageId);
    } finally {
      if (messageGenerationRef.current === messageId) {
        messageGenerationRef.current = null;
        setMessageGeneration(null);
      }
    }
  };

  const regenerate = (messageId: string) =>
    runMessageGeneration(messageId, 'regenerate', onRegenerate);

  const continueResponse = (messageId: string) =>
    runMessageGeneration(messageId, 'continue', onContinue);

  return (
    <>
      <div
        ref={scrollRef}
        data-chat-id={chatId}
        className="chat-message-scroller scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-scroll px-3 py-5 sm:px-5"
      >
        <div
          key={chatId}
          className="chat-message-canvas mx-auto mt-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4"
        >
          {visibleStart > 0 ? (
            <div className="flex justify-center py-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted"
                onPress={loadEarlierMessages}
              >
                <Icon name="chevron-left" className="size-3.5 rotate-90" />
                {t('messageList.loadEarlierMessages')}
              </Button>
            </div>
          ) : null}

          {visibleMessages.map((message) => {
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
              setDeleting(message);
            };
            const history = () => setHistoryMessageId(message.id);
            const isGenerating = messageGeneration?.messageId === message.id;
            const isRegenerating =
              isGenerating && messageGeneration?.mode === 'regenerate';
            const isContinuing =
              isGenerating && messageGeneration?.mode === 'continue';

            const content = (
              <MessageMenu
                message={message}
                onBranch={onBranch}
                onRemember={onRemember}
                onRegenerate={regenerate}
                onContinue={continueResponse}
                onSelectVariant={selectVariant}
                onEditRequest={edit}
                onDeleteRequest={remove}
                onHistoryRequest={history}
                onError={reportError}
              >
                <article
                  className={`chat-message-row group flex items-start gap-2.5 sm:gap-3 ${
                    isUser && !messengerMode ? 'flex-row-reverse' : ''
                  }`}
                >
                  {showAvatars ? (
                    <AppAvatar
                      src={avatar}
                      name={displayName}
                      className="size-8 sm:size-9"
                      square
                    />
                  ) : null}
                  <div
                    className={`flex min-w-0 flex-col ${
                      messengerMode
                        ? 'items-start w-full'
                        : isUser
                          ? 'max-w-[min(91%,44rem)] items-end sm:max-w-[min(88%,44rem)]'
                          : 'w-full items-start'
                    }`}
                  >
                    <div
                      className={`mb-1 flex min-w-0 items-center gap-2 text-xs text-muted ${
                        isUser && !messengerMode ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <strong className="truncate font-medium text-foreground">
                        {displayName}
                      </strong>
                      {showTimestamps ? (
                        <span className="shrink-0">{message.createdAt}</span>
                      ) : null}
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
                        messengerMode ? 'w-fit' : ''
                      } ${
                        isUser
                          ? 'border-accent/10 bg-accent/10'
                          : 'border-separator'
                      }`}
                    >
                      {isRegenerating ? (
                        <div
                          className="flex h-5 min-w-12 items-center gap-1"
                          role="status"
                          aria-label={t('messageList.isTyping')}
                        >
                          {[0, 1, 2].map((index) => (
                            <span
                              key={index}
                              className="typing-dot size-1.5 rounded-full bg-accent"
                              style={{ animationDelay: `${index * 140}ms` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <AnimatedVariantContent
                            message={message}
                            direction={variantDirections[message.id] ?? 'next'}
                          />
                          {isContinuing ? (
                            <div
                              className="mt-2 flex h-4 items-center gap-1"
                              role="status"
                              aria-label={t('messageList.isTyping')}
                            >
                              {[0, 1, 2].map((index) => (
                                <span
                                  key={index}
                                  className="typing-dot size-1 rounded-full bg-accent"
                                  style={{ animationDelay: `${index * 140}ms` }}
                                />
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </Surface>
                    {!isMobile ? (
                      <DesktopMessageActions
                        message={message}
                        onBranch={onBranch}
                        onRemember={onRemember}
                        onRegenerate={regenerate}
                        onContinue={continueResponse}
                        onSelectVariant={selectVariant}
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
                          void selectVariant(message.id, index).catch(
                            reportError,
                          )
                        }
                        onHistory={history}
                        onContinue={() =>
                          void continueResponse(message.id).catch(reportError)
                        }
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
                onSelectVariant={selectVariant}
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
            <article
              className={`message-enter flex items-start gap-2.5 opacity-75 sm:gap-3 ${
                messengerMode ? '' : 'flex-row-reverse'
              }`}
            >
              {showAvatars ? (
                <AppAvatar
                  src={userAvatar}
                  name={userName}
                  className="size-8 sm:size-9"
                  square
                />
              ) : null}
              <div
                className={`flex min-w-0 flex-col ${
                  messengerMode
                    ? 'max-w-[min(90%,42rem)] items-start'
                    : 'w-full items-end'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <span>{t('messageList.sending')}</span>
                  <strong className="font-medium text-foreground">
                    {userName}
                  </strong>
                </div>
                <Surface
                  variant="tertiary"
                  className={`${messengerMode ? 'w-fit' : ''} min-w-0 max-w-full overflow-hidden rounded-2xl border border-accent/10 bg-accent/10 px-4 py-3 shadow-xs`}
                >
                  <MarkdownContent>{pendingMessage}</MarkdownContent>
                </Surface>
              </div>
            </article>
          ) : null}

          {sending && !messageGeneration ? (
            <article className="message-enter flex items-start gap-2.5 sm:gap-3">
              {showAvatars ? (
                <AppAvatar
                  src={assistantAvatar}
                  name={assistantName}
                  className="size-8 sm:size-9"
                  square
                />
              ) : null}
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

      <MessageEditModal
        key={editing?.id ?? 'closed'}
        message={editing}
        onClose={() => setEditing(null)}
        onEdit={onEdit}
      />

      <UiModal
        isOpen={Boolean(deleting)}
        onOpenChange={(open) => !open && !working && setDeleting(null)}
        onConfirm={() => void commitDelete()}
        isConfirmDisabled={!deleting || working}
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
              autoFocus
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

export const MessageList = memo(MessageListComponent);
