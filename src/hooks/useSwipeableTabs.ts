import { useEffect, useRef } from 'react';
import { isMobilePlatform } from '../lib/platform';
import {
  TAB_SWIPE_ACTIVATION_PX,
  isHorizontalTabSwipeIntent,
  shouldCommitTabSwipe,
  tabKeyAfterSwipe,
} from '../lib/tabSwipe';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'summary',
  '[contenteditable="true"]',
  '[draggable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
].join(',');

const SWIPE_IGNORE_SELECTOR = [
  '[data-tab-swipe-ignore]',
  '[role="tablist"]',
  '.tabs__list-container',
  '.tabs__list-container__scroller',
].join(',');

type SwipeGesture = {
  touchId: number;
  startX: number;
  startY: number;
  startedAt: number;
  direction: 'pending' | 'horizontal' | 'vertical';
};

function hasHorizontalOverflow(element: Element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.scrollWidth <= element.clientWidth + 1) return false;

  const overflowX = window.getComputedStyle(element).overflowX;
  return overflowX === 'auto' || overflowX === 'scroll';
}

function shouldIgnoreSwipeStart(target: EventTarget | null, boundary: Element) {
  if (!(target instanceof Element)) return true;
  if (target.closest(INTERACTIVE_SELECTOR)) return true;
  if (target.closest(SWIPE_IGNORE_SELECTOR)) return true;

  let current: Element | null = target;
  while (current) {
    if (hasHorizontalOverflow(current)) return true;
    if (current === boundary) break;
    current = current.parentElement;
  }

  return false;
}

function findTouch(touches: TouchList, touchId: number) {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === touchId) return touch;
  }
  return undefined;
}

export function useSwipeableTabs<T extends string>({
  keys,
  selectedKey,
  onSelectionChange,
}: {
  keys: readonly T[];
  selectedKey: T;
  onSelectionChange: (key: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(keys);
  const selectedKeyRef = useRef(selectedKey);
  const onSelectionChangeRef = useRef(onSelectionChange);

  keysRef.current = keys;
  selectedKeyRef.current = selectedKey;
  onSelectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobilePlatform()) return;

    let gesture: SwipeGesture | undefined;

    const clearGesture = () => {
      gesture = undefined;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        shouldIgnoreSwipeStart(event.target, container)
      ) {
        clearGesture();
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) return;

      gesture = {
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startedAt: performance.now(),
        direction: 'pending',
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 1) {
        clearGesture();
        return;
      }

      const touch = findTouch(event.touches, gesture.touchId);
      if (!touch) {
        clearGesture();
        return;
      }

      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;

      if (gesture.direction === 'pending') {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TAB_SWIPE_ACTIVATION_PX) {
          return;
        }

        if (Math.abs(dy) >= Math.abs(dx)) {
          gesture.direction = 'vertical';
          return;
        }

        if (!isHorizontalTabSwipeIntent(dx, dy)) return;
        gesture.direction = 'horizontal';
      }

      if (gesture.direction === 'horizontal' && event.cancelable) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture) return;

      const finishedGesture = gesture;
      clearGesture();
      if (finishedGesture.direction === 'vertical') return;

      const touch = findTouch(event.changedTouches, finishedGesture.touchId);
      if (!touch) return;

      const dx = touch.clientX - finishedGesture.startX;
      const dy = touch.clientY - finishedGesture.startY;
      const elapsedMs = performance.now() - finishedGesture.startedAt;
      if (!shouldCommitTabSwipe(dx, dy, elapsedMs)) return;

      const currentKey = selectedKeyRef.current;
      const nextKey = tabKeyAfterSwipe(keysRef.current, currentKey, dx);
      if (nextKey !== currentKey) onSelectionChangeRef.current(nextKey);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', clearGesture, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', clearGesture);
    };
  }, []);

  return containerRef;
}
