import { Spinner, Toast, toast, type ToastContentValue } from '@heroui/react';
import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { QueuedToast } from 'react-aria-components/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isMobilePlatform } from '../../lib/platform';
import { shouldDismissToastSwipe, toastSwipeOpacity } from './toastSwipe';

const SWIPE_AXIS_THRESHOLD = 7;
const SWIPE_EXIT_MS = 160;

type ToastSwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  axis?: 'horizontal' | 'vertical';
};

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
  const isMobile = isMobilePlatform();
  const compactLayout = useMediaQuery('(max-width: 768px)');
  const gestureRef = useRef<ToastSwipeGesture | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const content = toastItem.content;

  useEffect(
    () => () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (gestureRef.current) toast.resumeAll();
    },
    [],
  );

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
      className={isMobile ? 'touch-pan-y' : undefined}
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
      <Toast.Content>
        {content.title ? <Toast.Title>{content.title}</Toast.Title> : null}
        {content.description ? (
          <Toast.Description>{content.description}</Toast.Description>
        ) : null}
        {compactLayout && content.actionProps?.children ? (
          <Toast.ActionButton {...content.actionProps} />
        ) : null}
      </Toast.Content>
      {!compactLayout && content.actionProps?.children ? (
        <Toast.ActionButton {...content.actionProps} />
      ) : null}
      <Toast.CloseButton />
    </Toast>
  );
}
