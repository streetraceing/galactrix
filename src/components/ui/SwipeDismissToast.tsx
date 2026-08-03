import {
  Button,
  Spinner,
  Toast,
  toast,
  type ToastContentValue,
} from '@heroui/react';
import { isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { QueuedToast } from 'react-aria-components/Toast';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isMobilePlatform } from '../../lib/platform';
import { Icon } from '../Icon';
import { shouldDismissToastSwipe, toastSwipeOpacity } from './toastSwipe';

const SWIPE_AXIS_THRESHOLD = 7;
const SWIPE_EXIT_MS = 160;

type ToastSwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  axis?: 'horizontal' | 'vertical';
};

type CopyState = 'idle' | 'copied' | 'failed';

export function readableToastText(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(readableToastText).filter(Boolean).join(' ');
  }
  if (isValidElement<{ children?: ReactNode }>(value)) {
    return readableToastText(value.props.children);
  }
  return '';
}

async function writeClipboardText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard is unavailable');
}

function resetToastPosition(element: HTMLElement) {
  element.style.transition = `transform ${SWIPE_EXIT_MS}ms var(--motion-ease), opacity ${SWIPE_EXIT_MS}ms linear`;
  element.style.transform = 'translateX(0)';
  element.style.opacity = '1';
}

export function SwipeDismissToast({
  toastItem,
}: {
  toastItem: QueuedToast<ToastContentValue>;
}) {
  const { t } = useTranslation('common');
  const isMobile = isMobilePlatform();
  const compactLayout = useMediaQuery('(max-width: 768px)');
  const gestureRef = useRef<ToastSwipeGesture | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const copyStateTimerRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const content = toastItem.content;
  const isDanger = content.variant === 'danger';
  const copyText = useMemo(
    () =>
      [readableToastText(content.title), readableToastText(content.description)]
        .filter(Boolean)
        .join('\n\n'),
    [content.description, content.title],
  );

  useEffect(() => {
    setExpanded(false);
    setCopyState('idle');
  }, [toastItem.key]);

  useEffect(() => {
    if (!expanded) return;
    toast.pauseAll();
    return () => toast.resumeAll();
  }, [expanded]);

  useEffect(
    () => () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (copyStateTimerRef.current != null) {
        window.clearTimeout(copyStateTimerRef.current);
      }
      if (gestureRef.current) toast.resumeAll();
    },
    [],
  );

  const copyError = async () => {
    if (!copyText) return;
    if (copyStateTimerRef.current != null) {
      window.clearTimeout(copyStateTimerRef.current);
    }
    try {
      await writeClipboardText(copyText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    copyStateTimerRef.current = window.setTimeout(
      () => setCopyState('idle'),
      1_800,
    );
  };

  const finishGesture = (
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = null;
    toast.resumeAll();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const deltaX = event.clientX - gesture.startX;
    const width = event.currentTarget.getBoundingClientRect().width;
    if (
      !cancelled &&
      gesture.axis === 'horizontal' &&
      shouldDismissToastSwipe(deltaX, width)
    ) {
      const direction = Math.sign(deltaX) || 1;
      event.currentTarget.style.transition = `transform ${SWIPE_EXIT_MS}ms var(--motion-ease-exit), opacity ${SWIPE_EXIT_MS}ms linear`;
      event.currentTarget.style.transform = `translateX(${direction * (width + 32)}px)`;
      event.currentTarget.style.opacity = '0';
      closeTimerRef.current = window.setTimeout(
        () => toast.close(toastItem.key),
        SWIPE_EXIT_MS,
      );
      return;
    }

    if (gesture.axis === 'horizontal') {
      resetToastPosition(event.currentTarget);
    }
  };

  return (
    <Toast
      toast={toastItem}
      variant={content.variant}
      className={`app-toast min-w-0 max-w-full ${
        isDanger ? 'app-toast-danger' : ''
      } ${isMobile ? 'touch-pan-y' : ''}`}
      onPointerDown={(event) => {
        if (
          !isMobile ||
          !event.isPrimary ||
          event.pointerType !== 'touch' ||
          (event.target instanceof Element && event.target.closest('button'))
        ) {
          return;
        }
        gestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
        event.currentTarget.style.transition = 'none';
        toast.pauseAll();
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - gesture.startX;
        const deltaY = event.clientY - gesture.startY;
        if (!gesture.axis) {
          if (
            Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_AXIS_THRESHOLD
          ) {
            return;
          }
          gesture.axis =
            Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
          if (gesture.axis === 'horizontal') {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }
        if (gesture.axis !== 'horizontal') return;

        event.preventDefault();
        const width = event.currentTarget.getBoundingClientRect().width;
        event.currentTarget.style.transform = `translateX(${deltaX}px)`;
        event.currentTarget.style.opacity = String(
          toastSwipeOpacity(deltaX, width),
        );
      }}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
    >
      {content.indicator === null ? null : content.isLoading ? (
        <Toast.Indicator variant={content.variant}>
          <Spinner color="current" size="sm" />
        </Toast.Indicator>
      ) : (
        <Toast.Indicator variant={content.variant}>
          {content.indicator}
        </Toast.Indicator>
      )}
      <Toast.Content className="min-w-0 overflow-hidden pr-4">
        {content.title ? (
          <Toast.Title className="max-w-full wrap-anywhere">
            {content.title}
          </Toast.Title>
        ) : null}
        {content.description ? (
          <Toast.Description
            className={`max-w-full whitespace-pre-wrap wrap-anywhere ${
              isDanger && expanded
                ? 'app-toast-description-expanded'
                : isDanger
                  ? 'line-clamp-2'
                  : 'line-clamp-3'
            }`}
          >
            {content.description}
          </Toast.Description>
        ) : null}
        {isDanger && copyText ? (
          <div className="mt-2 flex max-w-full flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 min-w-0 px-2 text-xs"
              onPress={() => void copyError()}
            >
              <Icon name="copy" className="size-3.5 shrink-0" />
              {copyState === 'copied'
                ? t('toast.copied')
                : copyState === 'failed'
                  ? t('toast.copyFailed')
                  : t('toast.copy')}
            </Button>
            {content.description ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 min-w-0 px-2 text-xs"
                onPress={() => setExpanded((current) => !current)}
              >
                {expanded ? t('toast.hideDetails') : t('toast.showDetails')}
              </Button>
            ) : null}
          </div>
        ) : null}
        {compactLayout && content.actionProps?.children ? (
          <Toast.ActionButton {...content.actionProps} />
        ) : null}
      </Toast.Content>
      {!compactLayout && content.actionProps?.children ? (
        <Toast.ActionButton {...content.actionProps} />
      ) : null}
      <Toast.CloseButton className="app-toast-close-button" />
    </Toast>
  );
}
