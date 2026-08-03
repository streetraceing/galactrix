import { Button, Surface, Tooltip } from '@heroui/react';
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
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
import { errorMessage } from '../../../lib/errors';
import { isMobilePlatform } from '../../../lib/platform';
import type { Message, Provider } from '../../../types';
import { MessageHistoryModal } from './MessageHistoryModal';
import { MessageEditModal } from './MessageEditModal';
import { useTranslation } from 'react-i18next';
import {
  buildMessageOffsets,
  estimateMessageHeight,
  MESSAGE_VIRTUAL_INITIAL_MIN_ITEMS,
  MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX,
  MESSAGE_VIRTUAL_MIN_ITEMS,
  MESSAGE_VIRTUAL_OVERSCAN_PX,
  MESSAGE_VIRTUALIZATION_THRESHOLD,
  messageVirtualRange,
} from '../messageWindow';
import { formatMessageTime } from '../messageTime';
import {
  isHorizontalSwipeIntent,
  mobileSwipeDragOffset,
  shouldCommitMobileSwipe,
} from '../mobileSwipe';
import {
  addMessageSelection,
  mergeMessageSelection,
  messageSelectionRange,
  shouldCollapseMessageRangeSelection,
  shouldStartMessageRangeSelection,
  toggleMessageSelection,
} from '../messageSelection';
import { copyChatText } from '../chatClipboard';

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

const MESSAGE_SELECTION_DRAG_THRESHOLD = 6;
const MESSAGE_SELECTION_RETURN_THRESHOLD = 28;
const TOUCH_SELECTION_MOVE_THRESHOLD = 10;
const SCROLL_TO_BOTTOM_RELEASE_MS = 1_400;
const CHAT_LAYOUT_BOTTOM_LOCK_MS = 420;

type MessageSelectionGesture = {
  pointerId: number;
  pointerType: string;
  button: number;
  startId: string;
  lastId: string;
  startX: number;
  startY: number;
  active: boolean;
  armed: boolean;
  expandedBeyondOrigin: boolean;
  baseSelection: Set<string>;
};

function messageIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return (
    target.closest<HTMLElement>('[data-message-id]')?.dataset.messageId ?? null
  );
}

function isMessageSelectionControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="button"], [contenteditable="true"], [data-message-selection-ignore]',
    ),
  );
}

function MessageMenu({
  message,
  children,
  viewActive,
  onBranch,
  onEditRequest,
  onDeleteRequest,
  onRemember,
  onRegenerate,
  onContinue,
  onSelectVariant,
  onSelectMessage,
  onHistoryRequest,
  onError,
}: MessageActionProps & {
  children: ReactNode;
  viewActive: boolean;
  onSelectMessage: (messageId: string) => void;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isMobile && !viewActive) setOpen(false);
  }, [isMobile, viewActive]);

  const run = (action: () => Promise<void>) => {
    void action().catch((error) => onError(errorMessage(error)));
  };
  const isAssistant = message.role === 'assistant';

  if (isMobile && !viewActive) {
    return <div className="block min-w-0">{children}</div>;
  }

  return (
    <ContextMenu
      open={isMobile ? open && viewActive : undefined}
      onOpenChange={(nextOpen) => {
        if (isMobile) setOpen(viewActive && nextOpen);
      }}
    >
      <ContextMenuTrigger
        className={`block min-w-0 ${isMobile ? 'mobile-message-context-target' : ''}`}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[min(16rem,calc(100dvw-1rem))] max-h-[calc(100dvh-1rem)] max-w-[calc(100dvw-1rem)] overflow-y-auto overscroll-contain">
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
            {isMobile ? (
              <ContextMenuItem onClick={onHistoryRequest}>
                <Icon name="history" className="size-4" />
                {t('messageHistoryModal.responseHistory')}
                <span className="ml-auto text-xs tabular-nums text-muted">
                  {message.activeVariantIndex + 1}/{message.variants.length}
                </span>
              </ContextMenuItem>
            ) : (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Icon name="history" className="size-4" />
                  {t('messageHistoryModal.responseHistory')}
                  <span className="ml-auto mr-1 text-xs tabular-nums text-muted">
                    {message.activeVariantIndex + 1}/{message.variants.length}
                  </span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-[min(70dvh,30rem)] overflow-y-auto overscroll-contain">
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
            )}
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onClick={() => onSelectMessage(message.id)}>
          <Icon name="check" className="size-4" />
          {t('messageList.selectMessage')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => run(() => onBranch(message.id))}>
          <Icon name="branch" className="size-4" />
          {t('messageList.branchFromHere')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => run(() => copyChatText(message.content))}
        >
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
  enabled = true,
}: {
  message: Message;
  direction: VariantDirection;
  enabled?: boolean;
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
      !enabled ||
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
  }, [enabled, message.activeVariantIndex, message.content]);

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
  onContinue,
  onSelectVariant,
  onHistoryRequest,
  onError,
}: MessageActionProps) {
  const { t } = useTranslation('chats');
  const run = (action: () => Promise<void>) => {
    void action().catch((error) => onError(errorMessage(error)));
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
      onPress: () => run(() => copyChatText(message.content)),
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

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitForMotion(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function finishAnimation(animation: Animation | null) {
  if (!animation) return;
  try {
    await animation.finished;
  } catch {
    // A newer render or a closed chat can cancel the height animation.
  }
}

type SwipeMotionPhase =
  'idle' | 'dragging' | 'settling' | 'exiting' | 'preparing' | 'entering';

function SwipeableMessage({
  message,
  children,
  onSelectVariant,
  onRegenerate,
  onError,
  isSelectionGesture,
}: {
  message: Message;
  children: ReactNode;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onError: (message: string) => void;
  isSelectionGesture: (pointerId: number) => boolean;
}) {
  const { t } = useTranslation('chats');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const motionRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<{
    id: number;
    x: number;
    y: number;
    startedAt: number;
    axis: 'pending' | 'horizontal' | 'vertical';
  } | null>(null);
  const dragOffsetRef = useRef(0);
  const selectingVariant = useRef(false);
  const heightAnimationRef = useRef<Animation | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [motionPhase, setMotionPhase] = useState<SwipeMotionPhase>('idle');

  const setOffset = (offset: number) => {
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const resetPointer = () => {
    pointerStart.current = null;
  };

  const unlockContainer = () => {
    const container = containerRef.current;
    heightAnimationRef.current?.cancel();
    heightAnimationRef.current = null;
    if (!container) return;
    container.style.removeProperty('height');
    container.style.removeProperty('overflow');
  };

  const animateBackToRest = async () => {
    if (dragOffsetRef.current === 0) {
      setMotionPhase('idle');
      return;
    }
    setMotionPhase('settling');
    await nextAnimationFrame();
    setOffset(0);
    await waitForMotion(150);
    setMotionPhase('idle');
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

    heightAnimationRef.current?.cancel();
    setMotionPhase('dragging');
    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
      axis: 'pending',
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId || selectingVariant.current) {
      return;
    }

    if (isSelectionGesture(event.pointerId)) {
      resetPointer();
      setOffset(0);
      setMotionPhase('idle');
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.axis === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 4) return;
      if (isHorizontalSwipeIntent(dx, dy)) {
        start.axis = 'horizontal';
      } else if (Math.abs(dy) > Math.abs(dx)) {
        start.axis = 'vertical';
        resetPointer();
        setOffset(0);
        setMotionPhase('idle');
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      } else {
        return;
      }
    }

    if (start.axis !== 'horizontal') return;
    event.preventDefault();

    const activePosition = getActiveVariantPosition(message);
    const hasTarget =
      dx < 0 ? true : Boolean(message.variants[activePosition - 1]);
    setOffset(mobileSwipeDragOffset(dx, hasTarget));
  };

  const runCommittedGesture = async (
    direction: -1 | 1,
    action: () => Promise<void>,
    waitForResultBeforeEntry: boolean,
  ) => {
    const container = containerRef.current;
    const motion = motionRef.current;
    const oldHeight = container?.getBoundingClientRect().height ?? 0;
    const animationsEnabled =
      document.documentElement.dataset.animations !== 'off';

    selectingVariant.current = true;
    if (container && oldHeight > 0) {
      container.style.height = `${oldHeight}px`;
      container.style.overflow = 'clip';
    }

    if (animationsEnabled) {
      setMotionPhase('exiting');
      await nextAnimationFrame();
      setOffset(direction * 104);
      await waitForMotion(120);
    }

    const resultPromise = action().then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    let result: { ok: true } | { ok: false; error: unknown } | undefined;
    if (waitForResultBeforeEntry) result = await resultPromise;
    await nextAnimationFrame();

    if (animationsEnabled) {
      setMotionPhase('preparing');
      setOffset(-direction * 52);
      await nextAnimationFrame();

      const nextHeight = motion?.scrollHeight ?? oldHeight;
      const heightAnimation =
        container && oldHeight > 0 && nextHeight > 0 && oldHeight !== nextHeight
          ? container.animate(
              [{ height: `${oldHeight}px` }, { height: `${nextHeight}px` }],
              {
                duration: 180,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'forwards',
              },
            )
          : null;
      heightAnimationRef.current = heightAnimation;

      setMotionPhase('entering');
      await nextAnimationFrame();
      setOffset(0);
      await Promise.all([waitForMotion(180), finishAnimation(heightAnimation)]);
    } else {
      setOffset(0);
    }

    unlockContainer();
    setMotionPhase('idle');

    if (!result) result = await resultPromise;
    if (!result.ok) onError(String(result.error));
    selectingVariant.current = false;
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
    const elapsedMs = performance.now() - start.startedAt;
    if (
      start.axis !== 'horizontal' ||
      !shouldCommitMobileSwipe(dx, dy, elapsedMs)
    ) {
      await animateBackToRest();
      return;
    }

    const activePosition = getActiveVariantPosition(message);
    const nextPosition = dx < 0 ? activePosition + 1 : activePosition - 1;
    const nextVariant = message.variants[nextPosition];
    const shouldRegenerate = dx < 0 && !nextVariant;
    if (!nextVariant && !shouldRegenerate) {
      await animateBackToRest();
      return;
    }

    const direction = dx < 0 ? -1 : 1;
    await runCommittedGesture(
      direction,
      () =>
        shouldRegenerate
          ? onRegenerate(message.id)
          : onSelectVariant(message.id, nextVariant!.index),
      !shouldRegenerate,
    );
  };

  const cancelPointer = () => {
    resetPointer();
    void animateBackToRest();
  };

  const activePosition = getActiveVariantPosition(message);
  const revealPosition =
    dragOffset < 0 ? activePosition + 1 : activePosition - 1;
  const revealVariant = message.variants[revealPosition];
  const revealsRegeneration = dragOffset < 0 && !revealVariant;
  const revealProgress = Math.min(Math.abs(dragOffset) / 56, 1);
  const motionTransition =
    motionPhase === 'settling'
      ? 'transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 150ms ease-out'
      : motionPhase === 'exiting'
        ? 'transform 120ms cubic-bezier(0.4, 0, 1, 1), opacity 120ms ease-in'
        : motionPhase === 'entering'
          ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out'
          : 'none';
  const motionOpacity =
    motionPhase === 'exiting'
      ? 0.08
      : motionPhase === 'preparing'
        ? 0.18
        : motionPhase === 'dragging'
          ? 1 - revealProgress * 0.08
          : 1;

  return (
    <div
      ref={containerRef}
      className="relative -mx-4 px-4 touch-pan-y overflow-x-clip"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => void onPointerUp(event)}
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
        ref={motionRef}
        className="relative z-10"
        style={{
          opacity: motionOpacity,
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          transition: motionTransition,
          willChange: motionPhase === 'idle' ? 'auto' : 'transform, opacity',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const VARIANT_SELECTION_LOCK_MS = 180;

function MessageListComponent({
  chatId,
  messages,
  provider,
  assistantName,
  assistantAvatar,
  userName,
  userAvatar,
  sending,
  viewActive,
  viewMode,
  showAvatars,
  showTimestamps,
  providersAvailable,
  wide,
  scrollRef,
  scrollToBottomRequest,
  onBranch,
  onEdit,
  onDelete,
  onDeleteMany,
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
  sending: boolean;
  viewActive: boolean;
  viewMode: 'conversation' | 'messenger';
  showAvatars: boolean;
  showTimestamps: boolean;
  providersAvailable: boolean;
  wide: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollToBottomRequest: number;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onDeleteMany: (messageIds: string[]) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
}) {
  const { t, i18n } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const [editing, setEditing] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [deletingSelection, setDeletingSelection] = useState(false);
  const [historyMessageId, setHistoryMessageId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [messageGeneration, setMessageGeneration] = useState<{
    messageId: string;
    mode: 'regenerate' | 'continue';
  } | null>(null);
  const messageGenerationRef = useRef<string | null>(null);
  const variantSelectionRef = useRef<string | null>(null);
  const selectionGestureRef = useRef<MessageSelectionGesture | null>(null);
  const suppressContextMenuUntilRef = useRef(0);
  const scrollingToBottomRef = useRef(false);
  const scrollToBottomReleaseTimerRef = useRef<number | null>(null);
  const virtualScrollFrameRef = useRef<number | null>(null);
  const bottomLockFrameRef = useRef<number | null>(null);
  const bottomLockUntilRef = useRef(0);
  const previousScrollToBottomRequestRef = useRef(scrollToBottomRequest);
  const messageCanvasRef = useRef<HTMLDivElement | null>(null);
  const userScrollIdleTimerRef = useRef<number | null>(null);
  const measurementCommitTimerRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const pendingMeasurementCommitRef = useRef(false);
  const pendingMeasurementAnchorRef = useRef<{
    messageId: string;
    viewportOffset: number;
    pinBottom: boolean;
  } | null>(null);
  const programmaticScrollRef = useRef(false);
  const nearBottomRef = useRef(true);
  const previousViewStateRef = useRef({
    chatId: '',
    active: false,
    wide,
  });
  const previousGenerationStateRef = useRef({
    sending,
    generationKey: '',
  });
  const virtualMessageElementsRef = useRef(new Map<string, HTMLDivElement>());
  const virtualMessageRefCallbacksRef = useRef(
    new Map<string, (node: HTMLDivElement | null) => void>(),
  );
  const virtualResizeObserverRef = useRef<ResizeObserver | null>(null);
  const measuredMessageHeightsRef = useRef(new Map<string, number>());
  const estimatedMessageHeightsRef = useRef(new Map<string, number>());
  const messageMeasurementSignaturesRef = useRef(
    new Map<
      string,
      {
        mobile: boolean;
        wide: boolean;
        role: Message['role'];
        activeVariantIndex: number;
        contentLength: number;
      }
    >(),
  );
  const [messageMeasurementVersion, setMessageMeasurementVersion] = useState(0);
  const [virtualBufferReadyChatId, setVirtualBufferReady] = useState<
    string | null
  >(null);
  const virtualLayoutKey = `${chatId}:${wide ? 'wide' : 'normal'}`;
  const [virtualWindow, setVirtualWindow] = useState(() => ({
    layoutKey: virtualLayoutKey,
    start: Math.max(0, messages.length - 12),
    end: messages.length,
  }));
  const [variantDirections, setVariantDirections] = useState<
    Record<string, VariantDirection>
  >({});
  const messengerMode = viewMode === 'messenger';
  const virtualizationEnabled =
    messages.length > MESSAGE_VIRTUALIZATION_THRESHOLD;
  const virtualBufferReady = virtualBufferReadyChatId === virtualLayoutKey;
  const virtualOverscan = virtualBufferReady
    ? MESSAGE_VIRTUAL_OVERSCAN_PX
    : MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX;
  const virtualMinimumItems = virtualBufferReady
    ? MESSAGE_VIRTUAL_MIN_ITEMS
    : MESSAGE_VIRTUAL_INITIAL_MIN_ITEMS;
  const lastMessage = messages[messages.length - 1];
  const hasPendingAssistant =
    lastMessage?.role === 'assistant' && lastMessage.pending === true;
  const showStandaloneTypingBubble =
    sending &&
    !hasPendingAssistant &&
    (!messageGeneration || messageGeneration.mode === 'continue');
  const estimatedMessageHeights = useMemo(() => {
    if (!virtualizationEnabled) return [];
    return messages.map((message) => {
      const previousSignature = messageMeasurementSignaturesRef.current.get(
        message.id,
      );
      let estimated = estimatedMessageHeightsRef.current.get(message.id);
      if (
        estimated == null ||
        previousSignature?.mobile !== isMobile ||
        previousSignature?.wide !== wide ||
        previousSignature?.role !== message.role ||
        previousSignature?.activeVariantIndex !== message.activeVariantIndex ||
        previousSignature?.contentLength !== message.content.length
      ) {
        estimated = estimateMessageHeight(message, isMobile, wide);
        estimatedMessageHeightsRef.current.set(message.id, estimated);
        messageMeasurementSignaturesRef.current.set(message.id, {
          mobile: isMobile,
          wide,
          role: message.role,
          activeVariantIndex: message.activeVariantIndex,
          contentLength: message.content.length,
        });
        measuredMessageHeightsRef.current.delete(message.id);
      }
      return measuredMessageHeightsRef.current.get(message.id) ?? estimated;
    });
  }, [
    isMobile,
    messageMeasurementVersion,
    messages,
    virtualizationEnabled,
    wide,
  ]);
  const messageOffsets = useMemo(
    () =>
      virtualizationEnabled
        ? buildMessageOffsets(estimatedMessageHeights)
        : [0],
    [estimatedMessageHeights, virtualizationEnabled],
  );
  const totalVirtualHeight = messageOffsets[messageOffsets.length - 1] ?? 0;
  const fallbackVirtualRange = useMemo(() => {
    if (!virtualizationEnabled) return { start: 0, end: messages.length };
    const scroller = scrollRef.current;
    const viewportHeight = scroller?.clientHeight ?? 1;
    return messageVirtualRange(
      messageOffsets,
      Number.POSITIVE_INFINITY,
      viewportHeight,
      virtualOverscan,
      virtualMinimumItems,
    );
  }, [
    messageOffsets,
    messages.length,
    scrollRef,
    virtualMinimumItems,
    virtualOverscan,
    virtualizationEnabled,
  ]);
  const virtualRange =
    virtualizationEnabled && virtualWindow.layoutKey === virtualLayoutKey
      ? virtualWindow
      : fallbackVirtualRange;
  const keepVirtualTailMounted =
    virtualizationEnabled &&
    nearBottomRef.current &&
    (sending || hasPendingAssistant || virtualRange.end >= messages.length - 2);
  const visibleStart = virtualizationEnabled ? virtualRange.start : 0;
  const visibleEnd = virtualizationEnabled
    ? keepVirtualTailMounted
      ? messages.length
      : virtualRange.end
    : messages.length;
  const visibleMessages = useMemo(
    () => messages.slice(visibleStart, visibleEnd),
    [messages, visibleEnd, visibleStart],
  );
  const visibleMessageIds = useMemo(
    () => visibleMessages.map((message) => message.id),
    [visibleMessages],
  );
  const clearSelectionGesture = useCallback(
    (pointerId?: number) => {
      const gesture = selectionGestureRef.current;
      if (!gesture) return;

      const scroller = scrollRef.current;
      const capturedPointerId = pointerId ?? gesture.pointerId;
      if (scroller?.hasPointerCapture(capturedPointerId)) {
        scroller.releasePointerCapture(capturedPointerId);
      }
      selectionGestureRef.current = null;
    },
    [scrollRef],
  );

  const clearMessageSelection = useCallback(() => {
    clearSelectionGesture();
    suppressContextMenuUntilRef.current = 0;
    setDeletingSelection(false);
    setSelectedMessageIds((current) =>
      current.size === 0 ? current : new Set(),
    );
  }, [clearSelectionGesture]);

  useEffect(
    () => () => {
      if (scrollToBottomReleaseTimerRef.current != null) {
        window.clearTimeout(scrollToBottomReleaseTimerRef.current);
      }
      if (virtualScrollFrameRef.current != null) {
        window.cancelAnimationFrame(virtualScrollFrameRef.current);
      }
      if (bottomLockFrameRef.current != null) {
        window.cancelAnimationFrame(bottomLockFrameRef.current);
      }
      if (userScrollIdleTimerRef.current != null) {
        window.clearTimeout(userScrollIdleTimerRef.current);
      }
      if (measurementCommitTimerRef.current != null) {
        window.clearTimeout(measurementCommitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      selectedMessageIds.size === 0 ||
      editing ||
      deleting ||
      deletingSelection ||
      historyMessageId
    ) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      clearMessageSelection();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    clearMessageSelection,
    deleting,
    deletingSelection,
    editing,
    historyMessageId,
    selectedMessageIds.size,
  ]);

  useEffect(() => {
    if (
      selectedMessageIds.size === 0 ||
      editing ||
      deleting ||
      deletingSelection ||
      historyMessageId
    ) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) {
        clearMessageSelection();
        return;
      }
      if (target.closest('[data-message-selection-toolbar]')) return;

      const messageElement = target.closest('[data-message-id]');
      if (messageElement && !isMessageSelectionControl(target)) return;
      clearMessageSelection();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [
    clearMessageSelection,
    deleting,
    deletingSelection,
    editing,
    historyMessageId,
    selectedMessageIds.size,
  ]);

  useEffect(() => {
    const availableIds = new Set(messages.map((message) => message.id));
    setSelectedMessageIds((current) => {
      const next = new Set(
        [...current].filter((messageId) => availableIds.has(messageId)),
      );
      return next.size === current.size ? current : next;
    });
    for (const messageId of measuredMessageHeightsRef.current.keys()) {
      if (!availableIds.has(messageId)) {
        measuredMessageHeightsRef.current.delete(messageId);
        estimatedMessageHeightsRef.current.delete(messageId);
        messageMeasurementSignaturesRef.current.delete(messageId);
        virtualMessageRefCallbacksRef.current.delete(messageId);
      }
    }
  }, [messages]);

  const messageIdAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const element = document.elementFromPoint(clientX, clientY);
      const messageElement = element?.closest<HTMLElement>('[data-message-id]');
      const scroller = scrollRef.current;
      if (!messageElement || !scroller?.contains(messageElement)) return null;
      return messageElement.dataset.messageId ?? null;
    },
    [scrollRef],
  );

  const updateDragSelection = useCallback(
    (gesture: MessageSelectionGesture, endId: string) => {
      gesture.lastId = endId;
      setSelectedMessageIds(
        mergeMessageSelection(
          gesture.baseSelection,
          messageSelectionRange(visibleMessageIds, gesture.startId, endId),
        ),
      );
    },
    [visibleMessageIds],
  );

  const activateSelectionGesture = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      gesture: MessageSelectionGesture,
      endId: string,
    ) => {
      gesture.active = true;
      suppressContextMenuUntilRef.current = Number.POSITIVE_INFINITY;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      window.getSelection()?.removeAllRanges();
      if (endId !== gesture.startId) gesture.expandedBeyondOrigin = true;
      updateDragSelection(gesture, endId);
    },
    [updateDragSelection],
  );

  const handleSelectionPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || isMessageSelectionControl(event.target)) return;
      const messageId = messageIdFromTarget(event.target);
      if (!messageId) return;

      const isTouch = event.pointerType === 'touch';
      const isPrimaryMouse =
        event.pointerType === 'mouse' && event.button === 0;
      const isSecondaryMouse =
        event.pointerType === 'mouse' && event.button === 2;
      if (!isTouch && !isPrimaryMouse && !isSecondaryMouse) return;

      // A touch hold belongs to the message context menu. Starting the range
      // selection gesture here used to race with that menu and highlighted the
      // message instead. Once selection mode is already active, touch remains
      // available for extending or toggling the selection.
      if (isTouch && selectedMessageIds.size === 0) return;

      if (isPrimaryMouse && selectedMessageIds.size > 0) {
        event.preventDefault();
      }

      clearSelectionGesture();
      const gesture: MessageSelectionGesture = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        startId: messageId,
        lastId: messageId,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        armed: isSecondaryMouse || selectedMessageIds.size > 0,
        expandedBeyondOrigin: false,
        baseSelection: new Set(selectedMessageIds),
      };

      selectionGestureRef.current = gesture;
    },
    [clearSelectionGesture, selectedMessageIds],
  );

  const handleSelectionPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = selectionGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      const distance = Math.hypot(dx, dy);
      const isTouch = gesture.pointerType === 'touch';

      if (isTouch && !gesture.armed) {
        if (distance > TOUCH_SELECTION_MOVE_THRESHOLD) {
          clearSelectionGesture(event.pointerId);
        }
        return;
      }

      const pointedMessageId = messageIdAtPoint(event.clientX, event.clientY);
      const endId =
        pointedMessageId ??
        (gesture.active && Math.abs(dy) <= MESSAGE_SELECTION_RETURN_THRESHOLD
          ? gesture.startId
          : null);
      if (!endId) return;

      if (!gesture.active) {
        if (
          !shouldStartMessageRangeSelection(
            gesture.startId,
            endId,
            dx,
            dy,
            MESSAGE_SELECTION_DRAG_THRESHOLD,
          )
        ) {
          return;
        }
        activateSelectionGesture(event, gesture, endId);
      } else {
        if (endId !== gesture.startId) gesture.expandedBeyondOrigin = true;
        if (
          shouldCollapseMessageRangeSelection(
            gesture.baseSelection.size,
            gesture.startId,
            endId,
            dy,
            gesture.expandedBeyondOrigin,
            MESSAGE_SELECTION_RETURN_THRESHOLD,
          )
        ) {
          gesture.lastId = gesture.startId;
          setSelectedMessageIds(new Set(gesture.baseSelection));
        } else if (endId !== gesture.lastId) {
          updateDragSelection(gesture, endId);
        }
      }

      event.preventDefault();
    },
    [
      activateSelectionGesture,
      clearSelectionGesture,
      messageIdAtPoint,
      updateDragSelection,
    ],
  );

  const handleSelectionPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = selectionGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      const distance = Math.hypot(dx, dy);
      const wasActive = gesture.active;
      const pressThreshold =
        gesture.pointerType === 'touch'
          ? TOUCH_SELECTION_MOVE_THRESHOLD
          : MESSAGE_SELECTION_DRAG_THRESHOLD;
      const isShortSelectionPress =
        distance <= pressThreshold &&
        ((gesture.pointerType === 'mouse' && gesture.button === 0) ||
          gesture.pointerType === 'touch');

      if (wasActive) {
        suppressContextMenuUntilRef.current = Date.now() + 800;
        event.preventDefault();
      } else if (isShortSelectionPress) {
        setSelectedMessageIds((current) =>
          toggleMessageSelection(current, gesture.startId),
        );
      }

      clearSelectionGesture(event.pointerId);
    },
    [clearSelectionGesture],
  );

  const handleSelectionPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (selectionGestureRef.current?.active) {
        suppressContextMenuUntilRef.current = Date.now() + 800;
      }
      clearSelectionGesture(event.pointerId);
    },
    [clearSelectionGesture],
  );

  const isSelectionGesture = useCallback((pointerId: number) => {
    const gesture = selectionGestureRef.current;
    return gesture?.pointerId === pointerId && gesture.armed;
  }, []);

  useEffect(() => {
    setVirtualBufferReady(null);
    if (!virtualizationEnabled) return;

    let cancelled = false;
    let idleTimer: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      idleTimer = window.setTimeout(() => {
        if (cancelled) return;
        startTransition(() => setVirtualBufferReady(virtualLayoutKey));
      }, 140);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (idleTimer != null) window.clearTimeout(idleTimer);
    };
  }, [virtualLayoutKey, virtualizationEnabled]);

  const finishScrollToBottom = useCallback(() => {
    scrollingToBottomRef.current = false;
    if (scrollToBottomReleaseTimerRef.current != null) {
      window.clearTimeout(scrollToBottomReleaseTimerRef.current);
      scrollToBottomReleaseTimerRef.current = null;
    }
  }, []);

  const stopBottomLayoutLock = useCallback(() => {
    bottomLockUntilRef.current = 0;
    if (bottomLockFrameRef.current != null) {
      window.cancelAnimationFrame(bottomLockFrameRef.current);
      bottomLockFrameRef.current = null;
    }
  }, []);

  const pinScrollerToBottom = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    nearBottomRef.current = true;
  }, [scrollRef]);

  const lockScrollerToBottomDuringLayout = useCallback(
    (duration = CHAT_LAYOUT_BOTTOM_LOCK_MS) => {
      stopBottomLayoutLock();
      bottomLockUntilRef.current = performance.now() + duration;

      const pin = () => {
        bottomLockFrameRef.current = null;
        if (!viewActive) return;
        pinScrollerToBottom();
        if (performance.now() < bottomLockUntilRef.current) {
          bottomLockFrameRef.current = window.requestAnimationFrame(pin);
        }
      };

      pin();
    },
    [pinScrollerToBottom, stopBottomLayoutLock, viewActive],
  );

  const updateScrollToBottomVisibility = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const distanceFromBottom = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    );
    nearBottomRef.current = distanceFromBottom <= 4;

    if (scrollingToBottomRef.current) {
      setShowScrollToBottom(false);
      if (distanceFromBottom <= 4) finishScrollToBottom();
      return;
    }

    const showThreshold = Math.max(240, scroller.clientHeight * 0.55);
    const hideThreshold = Math.max(120, scroller.clientHeight * 0.25);
    setShowScrollToBottom((current) =>
      current
        ? distanceFromBottom > hideThreshold
        : distanceFromBottom > showThreshold,
    );
  }, [finishScrollToBottom, scrollRef]);

  const scrollToBottom = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const smooth = document.documentElement.dataset.animations !== 'off';
    finishScrollToBottom();
    scrollingToBottomRef.current = true;
    setShowScrollToBottom(false);
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    if (!smooth) {
      window.requestAnimationFrame(() => {
        finishScrollToBottom();
        updateScrollToBottomVisibility();
      });
      return;
    }
    scrollToBottomReleaseTimerRef.current = window.setTimeout(() => {
      finishScrollToBottom();
      updateScrollToBottomVisibility();
    }, SCROLL_TO_BOTTOM_RELEASE_MS);
  }, [finishScrollToBottom, scrollRef, updateScrollToBottomVisibility]);

  useLayoutEffect(() => {
    if (previousScrollToBottomRequestRef.current === scrollToBottomRequest) {
      return;
    }
    previousScrollToBottomRequestRef.current = scrollToBottomRequest;
    if (viewActive) scrollToBottom();
  }, [scrollToBottom, scrollToBottomRequest, viewActive]);

  const syncVirtualWindow = useCallback(() => {
    if (!virtualizationEnabled) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const next = messageVirtualRange(
      messageOffsets,
      scroller.scrollTop,
      scroller.clientHeight,
      virtualOverscan,
      virtualMinimumItems,
    );
    setVirtualWindow((current) => {
      if (
        current.layoutKey === virtualLayoutKey &&
        current.start === next.start &&
        current.end === next.end
      ) {
        return current;
      }
      return { layoutKey: virtualLayoutKey, ...next };
    });
  }, [
    messageOffsets,
    virtualLayoutKey,
    scrollRef,
    virtualMinimumItems,
    virtualOverscan,
    virtualizationEnabled,
  ]);

  const scheduleVirtualWindowSync = useCallback(() => {
    if (virtualScrollFrameRef.current != null) return;
    virtualScrollFrameRef.current = window.requestAnimationFrame(() => {
      virtualScrollFrameRef.current = null;
      startTransition(syncVirtualWindow);
    });
  }, [syncVirtualWindow]);

  const registerVirtualMessage = useCallback(
    (messageId: string, node: HTMLDivElement | null) => {
      const previous = virtualMessageElementsRef.current.get(messageId);
      if (previous === node) return;
      if (previous) virtualResizeObserverRef.current?.unobserve(previous);

      if (node) {
        virtualMessageElementsRef.current.set(messageId, node);
        virtualResizeObserverRef.current?.observe(node);
      } else {
        virtualMessageElementsRef.current.delete(messageId);
      }
    },
    [],
  );

  const virtualMessageRefFor = useCallback(
    (messageId: string) => {
      const existing = virtualMessageRefCallbacksRef.current.get(messageId);
      if (existing) return existing;
      const callback = (node: HTMLDivElement | null) =>
        registerVirtualMessage(messageId, node);
      virtualMessageRefCallbacksRef.current.set(messageId, callback);
      return callback;
    },
    [registerVirtualMessage],
  );

  const commitMeasuredMessageHeights = useCallback(() => {
    if (!pendingMeasurementCommitRef.current) return;
    pendingMeasurementCommitRef.current = false;
    if (measurementCommitTimerRef.current != null) {
      window.clearTimeout(measurementCommitTimerRef.current);
      measurementCommitTimerRef.current = null;
    }

    const scroller = scrollRef.current;
    if (scroller) {
      const scrollerTop = scroller.getBoundingClientRect().top;
      const anchor = visibleMessageIds
        .map((messageId) => ({
          messageId,
          element: virtualMessageElementsRef.current.get(messageId),
        }))
        .find(({ element }) =>
          Boolean(
            element && element.getBoundingClientRect().bottom > scrollerTop,
          ),
        );
      pendingMeasurementAnchorRef.current = anchor?.element
        ? {
            messageId: anchor.messageId,
            viewportOffset:
              anchor.element.getBoundingClientRect().top - scrollerTop,
            pinBottom:
              scroller.scrollHeight -
                scroller.clientHeight -
                scroller.scrollTop <=
              2,
          }
        : null;
    }

    setMessageMeasurementVersion((current) => current + 1);
  }, [scrollRef, visibleMessageIds]);

  const scheduleMeasuredMessageCommit = useCallback(
    (delay = 320) => {
      if (measurementCommitTimerRef.current != null) {
        window.clearTimeout(measurementCommitTimerRef.current);
      }
      measurementCommitTimerRef.current = window.setTimeout(() => {
        measurementCommitTimerRef.current = null;
        if (!isUserScrollingRef.current) commitMeasuredMessageHeights();
      }, delay);
    },
    [commitMeasuredMessageHeights],
  );

  useLayoutEffect(() => {
    const anchor = pendingMeasurementAnchorRef.current;
    if (!anchor) return;
    pendingMeasurementAnchorRef.current = null;

    const scroller = scrollRef.current;
    if (!scroller) return;
    programmaticScrollRef.current = true;
    if (anchor.pinBottom) {
      scroller.scrollTop = scroller.scrollHeight;
    } else {
      const element = virtualMessageElementsRef.current.get(anchor.messageId);
      if (element) {
        const currentOffset =
          element.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top;
        const correction = currentOffset - anchor.viewportOffset;
        if (Math.abs(correction) > 0.5) scroller.scrollTop += correction;
      }
    }
    const frame = window.requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
      scheduleVirtualWindowSync();
      updateScrollToBottomVisibility();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    messageMeasurementVersion,
    scheduleVirtualWindowSync,
    scrollRef,
    updateScrollToBottomVisibility,
  ]);

  useEffect(() => {
    if (!virtualizationEnabled || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      let changed = false;

      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const messageId = element.dataset.virtualMessageId;
        if (!messageId) continue;

        const borderBox = entry.borderBoxSize[0];
        const measuredHeight = Math.max(
          1,
          Math.ceil(
            borderBox?.blockSize ?? element.getBoundingClientRect().height,
          ),
        );
        const previousHeight =
          measuredMessageHeightsRef.current.get(messageId) ??
          estimatedMessageHeightsRef.current.get(messageId) ??
          measuredHeight;
        if (Math.abs(measuredHeight - previousHeight) < 1) continue;

        measuredMessageHeightsRef.current.set(messageId, measuredHeight);
        changed = true;
      }

      if (!changed) return;
      pendingMeasurementCommitRef.current = true;
      if (!isUserScrollingRef.current) scheduleMeasuredMessageCommit();
    });

    virtualResizeObserverRef.current = observer;
    for (const element of virtualMessageElementsRef.current.values()) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
      if (virtualResizeObserverRef.current === observer) {
        virtualResizeObserverRef.current = null;
      }
    };
  }, [scheduleMeasuredMessageCommit, virtualizationEnabled]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (
        nearBottomRef.current ||
        performance.now() < bottomLockUntilRef.current
      ) {
        pinScrollerToBottom();
      }
      scheduleVirtualWindowSync();
    });
    observer.observe(scroller);
    if (messageCanvasRef.current) observer.observe(messageCanvasRef.current);
    return () => observer.disconnect();
  }, [chatId, pinScrollerToBottom, scheduleVirtualWindowSync, scrollRef, wide]);

  useLayoutEffect(() => {
    const previous = previousViewStateRef.current;
    const chatChanged = previous.chatId !== chatId || !previous.active;
    const layoutChanged = previous.wide !== wide;
    const shouldResetPosition = viewActive && (chatChanged || layoutChanged);
    previousViewStateRef.current = { chatId, active: viewActive, wide };
    if (!shouldResetPosition) return;

    finishScrollToBottom();
    if (chatChanged) {
      clearMessageSelection();
      setEditing(null);
      setDeleting(null);
      setHistoryMessageId(null);
      setMessageGeneration(null);
      messageGenerationRef.current = null;
      variantSelectionRef.current = null;
      setVariantDirections({});
    }
    setShowScrollToBottom(false);
    pendingMeasurementCommitRef.current = false;
    nearBottomRef.current = true;
    if (measurementCommitTimerRef.current != null) {
      window.clearTimeout(measurementCommitTimerRef.current);
      measurementCommitTimerRef.current = null;
    }

    const scroller = scrollRef.current;
    const viewportHeight = scroller?.clientHeight ?? 1;
    const bottomRange = virtualizationEnabled
      ? messageVirtualRange(
          messageOffsets,
          Number.POSITIVE_INFINITY,
          viewportHeight,
          virtualOverscan,
          virtualMinimumItems,
        )
      : { start: 0, end: messages.length };
    setVirtualWindow({ layoutKey: virtualLayoutKey, ...bottomRange });

    if (!scroller) return;
    lockScrollerToBottomDuringLayout();
    const frame = window.requestAnimationFrame(() => {
      pinScrollerToBottom();
      syncVirtualWindow();
      updateScrollToBottomVisibility();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    chatId,
    clearMessageSelection,
    finishScrollToBottom,
    lockScrollerToBottomDuringLayout,
    messageOffsets,
    messages.length,
    pinScrollerToBottom,
    scrollRef,
    syncVirtualWindow,
    updateScrollToBottomVisibility,
    viewActive,
    virtualLayoutKey,
    virtualMinimumItems,
    virtualOverscan,
    virtualizationEnabled,
    wide,
  ]);

  useLayoutEffect(() => {
    const generationKey = messageGeneration
      ? `${messageGeneration.mode}:${messageGeneration.messageId}`
      : '';
    const previous = previousGenerationStateRef.current;
    const shouldForceBottom =
      viewActive &&
      (previous.sending !== sending ||
        previous.generationKey !== generationKey);
    previousGenerationStateRef.current = { sending, generationKey };
    if (!shouldForceBottom) return;

    nearBottomRef.current = true;
    setShowScrollToBottom(false);
    const frame = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      scroller.scrollTop = scroller.scrollHeight;
      syncVirtualWindow();
      updateScrollToBottomVisibility();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    messageGeneration,
    scrollRef,
    sending,
    syncVirtualWindow,
    updateScrollToBottomVisibility,
    viewActive,
  ]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (scroller && nearBottomRef.current) {
        scroller.scrollTop = scroller.scrollHeight;
      }
      syncVirtualWindow();
      updateScrollToBottomVisibility();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    chatId,
    messages.length,
    sending,
    scrollRef,
    syncVirtualWindow,
    totalVirtualHeight,
    updateScrollToBottomVisibility,
  ]);

  const handleMessageScroll = useCallback(() => {
    const layoutLocked = performance.now() < bottomLockUntilRef.current;
    const programmatic = programmaticScrollRef.current;
    if (!layoutLocked && !programmatic) {
      isUserScrollingRef.current = true;
      if (userScrollIdleTimerRef.current != null) {
        window.clearTimeout(userScrollIdleTimerRef.current);
      }
      if (measurementCommitTimerRef.current != null) {
        window.clearTimeout(measurementCommitTimerRef.current);
        measurementCommitTimerRef.current = null;
      }
      userScrollIdleTimerRef.current = window.setTimeout(() => {
        userScrollIdleTimerRef.current = null;
        isUserScrollingRef.current = false;
        commitMeasuredMessageHeights();
      }, 3_000);
    }

    updateScrollToBottomVisibility();
    if (virtualizationEnabled) scheduleVirtualWindowSync();
  }, [
    commitMeasuredMessageHeights,
    scheduleVirtualWindowSync,
    updateScrollToBottomVisibility,
    virtualizationEnabled,
  ]);

  const historyMessage = useMemo(
    () => messages.find((message) => message.id === historyMessageId) ?? null,
    [historyMessageId, messages],
  );
  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedMessageIds.has(message.id)),
    [messages, selectedMessageIds],
  );

  const requestEdit = (message: Message) => {
    setEditing(message);
  };

  const reportError = (error: unknown) => {
    const description = errorMessage(error);
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
    } finally {
      window.setTimeout(() => {
        if (variantSelectionRef.current === messageId) {
          variantSelectionRef.current = null;
        }
      }, VARIANT_SELECTION_LOCK_MS);
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

  const commitDeleteSelection = async () => {
    if (selectedMessages.length === 0 || working) return;
    setWorking(true);
    try {
      await onDeleteMany(selectedMessages.map((message) => message.id));
      clearMessageSelection();
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

  const copySelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    const transcript = selectedMessages
      .map((message) => {
        const author =
          message.role === 'user'
            ? userName
            : message.role === 'assistant'
              ? assistantName
              : t('messageList.system');
        return `${author}: ${message.content}`;
      })
      .join('\n\n');

    try {
      await copyChatText(
        transcript,
        t('messageList.selectedMessagesCopied', {
          count: selectedMessages.length,
        }),
      );
    } catch (nextError) {
      reportError(nextError);
    }
  };

  const selectAllMessages = useCallback(() => {
    setSelectedMessageIds(new Set(messages.map((message) => message.id)));
  }, [messages]);

  const selectMessage = useCallback((messageId: string) => {
    setSelectedMessageIds((current) => addMessageSelection(current, messageId));
  }, []);

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        {selectedMessageIds.size > 0 ? (
          <div
            data-message-selection-toolbar
            className="pointer-events-none absolute inset-x-0 top-2 z-30 flex flex-wrap items-center justify-center gap-2 px-4"
          >
            <Surface className="pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-overlay/95 py-1.5 pl-3 pr-1.5 shadow-overlay backdrop-blur-xl">
              <Icon name="check" className="size-4 text-accent" />
              <span
                className="text-sm font-medium"
                role="status"
                aria-live="polite"
              >
                {t('messageList.selectedMessages', {
                  count: selectedMessageIds.size,
                })}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="size-7 min-w-7 rounded-full"
                aria-label={t('messageList.clearSelection')}
                onPress={clearMessageSelection}
              >
                <Icon name="close" className="size-3.5" />
              </Button>
            </Surface>

            <Surface
              aria-label={t('messageList.selectionActions')}
              className="pointer-events-auto flex h-10 items-center gap-0.5 rounded-full bg-overlay/95 p-1 shadow-overlay backdrop-blur-xl"
            >
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="size-8 min-w-8 rounded-full"
                    aria-label={t('messageList.copySelectedMessages')}
                    onPress={() => void copySelectedMessages()}
                  >
                    <Icon name="copy" className="size-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {t('messageList.copySelectedMessages')}
                </Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="size-8 min-w-8 rounded-full"
                    aria-label={t('messageList.selectAllMessages')}
                    isDisabled={selectedMessageIds.size === messages.length}
                    onPress={selectAllMessages}
                  >
                    <Icon name="check" className="size-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {t('messageList.selectAllMessages')}
                </Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="danger"
                    className="size-8 min-w-8 rounded-full"
                    aria-label={t('chatDialogs.delete')}
                    isDisabled={working}
                    onPress={() => setDeletingSelection(true)}
                  >
                    <Icon name="trash" className="size-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('chatDialogs.delete')}</Tooltip.Content>
              </Tooltip>
            </Surface>
          </div>
        ) : null}
        <div
          ref={scrollRef}
          data-chat-id={chatId}
          className={`chat-message-scroller scrollbar-thin flex min-h-0 w-full flex-1 flex-col overflow-y-scroll pt-5 pb-2 px-3 sm:px-5 ${
            selectedMessageIds.size > 0 ? 'select-none' : ''
          }`}
          onScroll={handleMessageScroll}
          onPointerDown={handleSelectionPointerDown}
          onPointerMove={handleSelectionPointerMove}
          onPointerUp={handleSelectionPointerUp}
          onPointerCancel={handleSelectionPointerCancel}
          onContextMenuCapture={(event) => {
            if (
              selectionGestureRef.current?.active ||
              Date.now() < suppressContextMenuUntilRef.current
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div
            key={chatId}
            ref={messageCanvasRef}
            aria-busy={sending}
            className={`chat-message-canvas mx-auto mt-auto flex w-full flex-col ${
              wide ? 'max-w-5xl' : 'max-w-3xl'
            } ${sending ? 'pointer-events-none select-none' : ''}`}
          >
            <div
              className={
                virtualizationEnabled
                  ? 'chat-message-virtual-stage relative w-full shrink-0'
                  : 'contents'
              }
              style={
                virtualizationEnabled
                  ? { height: totalVirtualHeight }
                  : undefined
              }
            >
              <div
                className={
                  virtualizationEnabled
                    ? 'chat-message-virtual-window absolute inset-x-0 flex flex-col'
                    : 'contents'
                }
                style={
                  virtualizationEnabled
                    ? visibleEnd === messages.length
                      ? { bottom: 0 }
                      : { top: messageOffsets[visibleStart] ?? 0 }
                    : undefined
                }
              >
                {visibleMessages.map((message, visibleIndex) => {
                  const isUser = message.role === 'user';
                  const isSelected = selectedMessageIds.has(message.id);
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
                  const isGenerating =
                    messageGeneration?.messageId === message.id;
                  const isRegenerating =
                    isGenerating && messageGeneration?.mode === 'regenerate';
                  const isPendingAssistant =
                    message.role === 'assistant' && message.pending === true;
                  const showsTypingBubble =
                    isRegenerating || isPendingAssistant;
                  const isLastVisualMessage =
                    visibleStart + visibleIndex === messages.length - 1 &&
                    !showStandaloneTypingBubble;

                  const content = (
                    <div
                      data-message-id={message.id}
                      data-selected={isSelected}
                      className="chat-message-virtual-item relative isolate rounded-2xl"
                    >
                      <div className="relative z-10">
                        <MessageMenu
                          message={message}
                          viewActive={viewActive}
                          onBranch={onBranch}
                          onRemember={onRemember}
                          onRegenerate={regenerate}
                          onContinue={continueResponse}
                          onSelectVariant={selectVariant}
                          onSelectMessage={selectMessage}
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
                                  isUser && !messengerMode
                                    ? 'flex-row-reverse'
                                    : ''
                                }`}
                              >
                                <strong className="truncate font-medium text-foreground">
                                  {displayName}
                                </strong>
                                {showTimestamps ? (
                                  <span className="shrink-0">
                                    {formatMessageTime(
                                      message.updatedAt && message.updatedAt > 0
                                        ? message.updatedAt
                                        : message.createdAt,
                                      i18n.resolvedLanguage ?? i18n.language,
                                    )}
                                  </span>
                                ) : null}
                                {message.remembered ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 text-accent">
                                    <Icon name="memory" className="size-3" />
                                    {t('messageList.remembered')}
                                  </span>
                                ) : null}
                                {message.edited ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 text-muted">
                                    <Icon name="edit" className="size-3" />
                                    {t('messageList.edited')}
                                  </span>
                                ) : null}
                              </div>
                              <Surface
                                variant={isUser ? 'tertiary' : 'default'}
                                style={
                                  showsTypingBubble
                                    ? {
                                        width: '2.75rem',
                                        height: '2.75rem',
                                        minWidth: '2.75rem',
                                        maxWidth: '2.75rem',
                                        padding: 0,
                                      }
                                    : undefined
                                }
                                className={`${isMobile || selectedMessageIds.size > 0 ? 'select-none' : 'selectable'} min-w-0 max-w-full overflow-hidden rounded-2xl shadow-xs transition-colors ${
                                  showsTypingBubble
                                    ? 'grid size-11 shrink-0 place-items-center p-0'
                                    : 'px-4 py-3'
                                } ${messengerMode && !showsTypingBubble ? 'w-fit' : ''} ${isSelected ? (isUser ? 'bg-accent/15' : 'bg-default/85') : isUser ? 'bg-accent/10' : ''}`}
                              >
                                {showsTypingBubble ? (
                                  <div
                                    className="flex items-center gap-1"
                                    role="status"
                                    aria-label={t('messageList.isTyping')}
                                  >
                                    {[0, 1, 2].map((index) => (
                                      <span
                                        key={index}
                                        className="typing-dot size-1.5 rounded-full bg-accent"
                                        style={{
                                          animationDelay: `${index * 140}ms`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <>
                                    <AnimatedVariantContent
                                      message={message}
                                      direction={
                                        variantDirections[message.id] ?? 'next'
                                      }
                                      enabled={!isMobile}
                                    />
                                  </>
                                )}
                              </Surface>
                              {!isPendingAssistant && !isMobile ? (
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
                              ) : !isPendingAssistant ? (
                                <VariantNavigator
                                  message={message}
                                  compact
                                  onSelect={(index) =>
                                    void selectVariant(message.id, index).catch(
                                      reportError,
                                    )
                                  }
                                  onHistory={history}
                                />
                              ) : null}
                            </div>
                          </article>
                        </MessageMenu>
                      </div>
                    </div>
                  );

                  return (
                    <div
                      key={message.id}
                      ref={virtualMessageRefFor(message.id)}
                      data-virtual-message-id={message.id}
                      className={`chat-message-virtual-slot shrink-0 ${
                        isLastVisualMessage ? 'pb-0' : 'pb-3 sm:pb-4'
                      }`}
                    >
                      {isMobile ? (
                        <SwipeableMessage
                          message={message}
                          onSelectVariant={selectVariant}
                          onRegenerate={regenerate}
                          onError={reportError}
                          isSelectionGesture={isSelectionGesture}
                        >
                          {content}
                        </SwipeableMessage>
                      ) : (
                        content
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {showStandaloneTypingBubble ? (
              <article className="message-enter mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
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
                  <Surface className="grid size-11 shrink-0 place-items-center rounded-2xl p-0">
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="typing-dot size-1.5 rounded-full bg-accent"
                          style={{ animationDelay: `${index * 140}ms` }}
                        />
                      ))}
                    </span>
                  </Surface>
                </div>
              </article>
            ) : null}

            {messages.length === 0 && !sending ? (
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
        {showScrollToBottom ? (
          <Button
            isIconOnly
            size="lg"
            variant="secondary"
            className="absolute bottom-3 right-4 z-20 size-11 min-w-11 rounded-full bg-overlay/95 shadow-overlay backdrop-blur-xl sm:bottom-4 sm:right-6"
            aria-label={t('messageList.scrollToBottom')}
            onPress={scrollToBottom}
          >
            <Icon name="chevron-left" className="size-5 -rotate-90" />
          </Button>
        ) : null}
      </div>

      <MessageEditModal
        key={editing?.id ?? 'closed'}
        message={editing}
        onClose={() => setEditing(null)}
        onEdit={onEdit}
      />

      <UiModal
        isOpen={deletingSelection}
        onOpenChange={(open) =>
          !open && !working && setDeletingSelection(false)
        }
        onConfirm={() => void commitDeleteSelection()}
        isConfirmDisabled={selectedMessages.length === 0 || working}
        title={t('messageList.deleteSelectedMessages', {
          count: selectedMessages.length,
        })}
        description={t('messageList.selectedMessagesWillBeRemoved')}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={working}
              onPress={() => setDeletingSelection(false)}
            >
              {t('chatDialogs.cancel')}
            </Button>
            <Button
              variant="danger"
              autoFocus
              isPending={working}
              onPress={() => void commitDeleteSelection()}
            >
              {t('chatDialogs.delete')}
            </Button>
          </>
        }
      >
        <div className="max-h-48 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {selectedMessages.map((message) => (
            <p
              key={message.id}
              className="line-clamp-2 rounded-xl bg-default/60 px-3 py-2 text-sm leading-5 text-muted"
            >
              {message.content}
            </p>
          ))}
        </div>
      </UiModal>

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
