import { Button, Surface, TextArea, Tooltip } from '@heroui/react';
import {
  memo,
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
  shouldStartMessageRangeSelection,
  toggleMessageSelection,
} from '../messageSelection';

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
const TOUCH_SELECTION_MOVE_THRESHOLD = 10;
const TOUCH_MULTISELECT_HOLD_MS = 320;
const AUTO_LOAD_EARLIER_THRESHOLD = 280;
const SCROLL_TO_BOTTOM_RELEASE_MS = 1_400;

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
  activatedByHold: boolean;
  holdTimer: number | null;
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
  onSelectMessage,
  onHistoryRequest,
  onError,
}: MessageActionProps & {
  children: ReactNode;
  onSelectMessage: (messageId: string) => void;
}) {
  const { t } = useTranslation('chats');
  const isMobile = isMobilePlatform();
  const run = (action: () => Promise<void>) => {
    void action().catch((error) => onError(String(error)));
  };
  const isAssistant = message.role === 'assistant';

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block min-w-0">
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
  wide,
  scrollRef,
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
  pendingMessage: string;
  sending: boolean;
  viewMode: 'conversation' | 'messenger';
  showAvatars: boolean;
  showTimestamps: boolean;
  providersAvailable: boolean;
  wide: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBranch: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onDeleteMany: (messageIds: string[]) => Promise<void>;
  onRemember: (messageId: string, remembered: boolean) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: (messageId: string) => Promise<void>;
  onSelectVariant: (messageId: string, variantIndex: number) => Promise<void>;
}) {
  const { t } = useTranslation('chats');
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
  const loadingEarlierRef = useRef(false);
  const loadEarlierSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollingToBottomRef = useRef(false);
  const scrollToBottomReleaseTimerRef = useRef<number | null>(null);
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
  const visibleMessageIds = useMemo(
    () => visibleMessages.map((message) => message.id),
    [visibleMessages],
  );

  const clearSelectionGesture = useCallback(
    (pointerId?: number) => {
      const gesture = selectionGestureRef.current;
      if (!gesture) return;

      if (gesture.holdTimer != null) {
        window.clearTimeout(gesture.holdTimer);
      }

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
      const gesture = selectionGestureRef.current;
      if (gesture?.holdTimer != null) {
        window.clearTimeout(gesture.holdTimer);
      }
      if (scrollToBottomReleaseTimerRef.current != null) {
        window.clearTimeout(scrollToBottomReleaseTimerRef.current);
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
    const availableIds = new Set(messages.map((message) => message.id));
    setSelectedMessageIds((current) => {
      const next = new Set(
        [...current].filter((messageId) => availableIds.has(messageId)),
      );
      return next.size === current.size ? current : next;
    });
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
      if (gesture.holdTimer != null) {
        window.clearTimeout(gesture.holdTimer);
        gesture.holdTimer = null;
      }
      suppressContextMenuUntilRef.current = Number.POSITIVE_INFINITY;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      window.getSelection()?.removeAllRanges();
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
        activatedByHold: false,
        holdTimer: null,
        baseSelection: new Set(selectedMessageIds),
      };

      if (isTouch && selectedMessageIds.size === 0) {
        gesture.holdTimer = window.setTimeout(() => {
          if (selectionGestureRef.current !== gesture) return;
          gesture.armed = true;
          gesture.activatedByHold = true;
          gesture.active = true;
          gesture.holdTimer = null;
          suppressContextMenuUntilRef.current = Number.POSITIVE_INFINITY;
          const scroller = scrollRef.current;
          if (scroller && !scroller.hasPointerCapture(gesture.pointerId)) {
            scroller.setPointerCapture(gesture.pointerId);
          }
          window.getSelection()?.removeAllRanges();
          updateDragSelection(gesture, gesture.startId);
        }, TOUCH_MULTISELECT_HOLD_MS);
      }

      selectionGestureRef.current = gesture;
    },
    [clearSelectionGesture, scrollRef, selectedMessageIds, updateDragSelection],
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

      const endId = messageIdAtPoint(event.clientX, event.clientY);
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
      } else if (endId !== gesture.lastId) {
        updateDragSelection(gesture, endId);
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
      const wasTouchHold =
        gesture.pointerType === 'touch' && gesture.activatedByHold;
      const pressThreshold =
        gesture.pointerType === 'touch'
          ? TOUCH_SELECTION_MOVE_THRESHOLD
          : MESSAGE_SELECTION_DRAG_THRESHOLD;
      const isShortSelectionPress =
        distance <= pressThreshold &&
        ((gesture.pointerType === 'mouse' && gesture.button === 0) ||
          (gesture.pointerType === 'touch' && !wasTouchHold));

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

  const finishScrollToBottom = useCallback(() => {
    scrollingToBottomRef.current = false;
    if (scrollToBottomReleaseTimerRef.current != null) {
      window.clearTimeout(scrollToBottomReleaseTimerRef.current);
      scrollToBottomReleaseTimerRef.current = null;
    }
  }, []);

  const updateScrollToBottomVisibility = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const distanceFromBottom = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    );

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
    if (messageWindow.chatId !== chatId) {
      pendingScrollRestoreRef.current = null;
      loadingEarlierRef.current = false;
      finishScrollToBottom();
      clearMessageSelection();
      setEditing(null);
      setDeleting(null);
      setHistoryMessageId(null);
      setMessageGeneration(null);
      messageGenerationRef.current = null;
      variantSelectionRef.current = null;
      setVariantDirections({});
      setShowScrollToBottom(false);
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
  }, [
    chatId,
    clearMessageSelection,
    finishScrollToBottom,
    messageWindow,
    messages.length,
  ]);

  useLayoutEffect(() => {
    const restore = pendingScrollRestoreRef.current;
    const scroller = scrollRef.current;
    loadingEarlierRef.current = false;
    if (!restore || !scroller) return;

    pendingScrollRestoreRef.current = null;
    scroller.scrollTop =
      restore.scrollTop + (scroller.scrollHeight - restore.scrollHeight);
  }, [scrollRef, visibleStart]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollToBottomVisibility);
    return () => window.cancelAnimationFrame(frame);
  }, [
    chatId,
    messages.length,
    pendingMessage,
    sending,
    updateScrollToBottomVisibility,
    visibleStart,
  ]);

  const loadEarlierMessages = useCallback(() => {
    if (visibleStart <= 0 || loadingEarlierRef.current) return;
    loadingEarlierRef.current = true;

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

  useEffect(() => {
    const scroller = scrollRef.current;
    const sentinel = loadEarlierSentinelRef.current;
    if (!scroller || !sentinel || visibleStart <= 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      if (
        scroller.scrollHeight <=
        scroller.clientHeight + AUTO_LOAD_EARLIER_THRESHOLD
      ) {
        loadEarlierMessages();
      }
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadEarlierMessages();
      },
      {
        root: scroller,
        rootMargin: `${AUTO_LOAD_EARLIER_THRESHOLD}px 0px 0px`,
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadEarlierMessages, scrollRef, visibleStart]);

  const handleMessageScroll = useCallback(() => {
    updateScrollToBottomVisibility();
    const scroller = scrollRef.current;
    if (
      !scroller ||
      scrollingToBottomRef.current ||
      scroller.scrollTop > AUTO_LOAD_EARLIER_THRESHOLD
    ) {
      return;
    }
    loadEarlierMessages();
  }, [loadEarlierMessages, scrollRef, updateScrollToBottomVisibility]);

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

  const selectMessage = useCallback((messageId: string) => {
    setSelectedMessageIds((current) => addMessageSelection(current, messageId));
  }, []);

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        {selectedMessageIds.size > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4">
            <Surface className="pointer-events-auto flex items-center gap-2 rounded-full bg-overlay/95 py-1.5 pl-3 pr-1.5 shadow-overlay backdrop-blur-xl">
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
                size="sm"
                variant="danger"
                className="h-7 rounded-full px-2.5"
                isDisabled={working}
                onPress={() => setDeletingSelection(true)}
              >
                <Icon name="trash" className="size-3.5" />
                {t('chatDialogs.delete')}
              </Button>
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
          </div>
        ) : null}
        <div
          ref={scrollRef}
          data-chat-id={chatId}
          className={`chat-message-scroller scrollbar-thin flex min-h-0 w-full flex-1 flex-col overflow-y-scroll px-3 py-5 sm:px-5 ${
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
            className={`chat-message-canvas mx-auto mt-auto flex w-full flex-col gap-3 sm:gap-4 ${
              wide ? 'max-w-5xl' : 'max-w-3xl'
            }`}
          >
            {visibleStart > 0 ? (
              <div
                ref={loadEarlierSentinelRef}
                className="flex justify-center py-1"
              >
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
              const isGenerating = messageGeneration?.messageId === message.id;
              const isRegenerating =
                isGenerating && messageGeneration?.mode === 'regenerate';

              const content = (
                <div
                  data-message-id={message.id}
                  data-selected={isSelected}
                  className="chat-message-virtual-item relative isolate rounded-2xl"
                >
                  <div className="relative z-10">
                    <MessageMenu
                      message={message}
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
                              isUser && !messengerMode ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <strong className="truncate font-medium text-foreground">
                              {displayName}
                            </strong>
                            {showTimestamps ? (
                              <span className="shrink-0">
                                {formatMessageTime(message.createdAt)}
                              </span>
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
                            className={`${isMobile || selectedMessageIds.size > 0 ? 'select-none' : 'selectable'} min-w-0 max-w-full overflow-hidden rounded-2xl px-4 py-3 shadow-xs transition-colors ${
                              messengerMode ? 'w-fit' : ''
                            } ${isSelected ? 'bg-default/70' : isUser ? 'bg-accent/10' : ''}`}
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
                            />
                          )}
                        </div>
                      </article>
                    </MessageMenu>
                  </div>
                </div>
              );

              return isMobile ? (
                <SwipeableMessage
                  key={message.id}
                  message={message}
                  onSelectVariant={selectVariant}
                  onRegenerate={regenerate}
                  onError={reportError}
                  isSelectionGesture={isSelectionGesture}
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
                    className={`${messengerMode ? 'w-fit' : ''} min-w-0 max-w-full overflow-hidden rounded-2xl bg-accent/10 px-4 py-3 shadow-xs`}
                  >
                    <MarkdownContent>{pendingMessage}</MarkdownContent>
                  </Surface>
                </div>
              </article>
            ) : null}

            {sending &&
            (!messageGeneration || messageGeneration.mode === 'continue') ? (
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
                  <Surface className="flex h-11 items-center gap-1 rounded-2xl px-4">
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
