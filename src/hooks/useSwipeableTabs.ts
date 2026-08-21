import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { isMobilePlatform } from '../lib/platform';
import { animationsEnabled, MOTION_DURATION_MS } from '../lib/motion';
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

const TAB_SWIPE_VISUAL_MIN_PX = 36;
const TAB_SWIPE_VISUAL_MAX_PX = 64;
const TAB_SWIPE_VISUAL_WIDTH_RATIO = 0.16;
const TAB_SWIPE_FOLLOW_RATIO = 0.64;
const TAB_SWIPE_COMMIT_ANIMATION_MS = MOTION_DURATION_MS.emphasis;

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

function visualSwipeOffset(dx: number, containerWidth: number) {
  const maxOffset = Math.min(
    TAB_SWIPE_VISUAL_MAX_PX,
    Math.max(
      TAB_SWIPE_VISUAL_MIN_PX,
      containerWidth * TAB_SWIPE_VISUAL_WIDTH_RATIO,
    ),
  );
  const distance = Math.abs(dx) * TAB_SWIPE_FOLLOW_RATIO;
  const easedDistance = maxOffset * (1 - Math.exp(-distance / maxOffset));
  return Math.sign(dx) * easedDistance;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

function transitionSurface(container: HTMLElement) {
  return container.classList.contains('page-scroll')
    ? container.querySelector<HTMLElement>(':scope > .page-container')
    : container.querySelector<HTMLElement>('.tabs__panel');
}

function commitSelection<T extends string>(
  container: HTMLElement,
  nextKey: T,
  direction: 'next' | 'previous',
  onSelectionChange: (key: T) => void,
) {
  const documentWithTransition = document as ViewTransitionDocument;
  const startViewTransition = documentWithTransition.startViewTransition;
  if (!startViewTransition || !animationsEnabled()) {
    clearSwipeVisual(container);
    container.dataset.tabSwipeCommit = direction;
    onSelectionChange(nextKey);
    return;
  }

  const oldSurface = transitionSurface(container);
  if (!oldSurface) {
    clearSwipeVisual(container);
    onSelectionChange(nextKey);
    return;
  }

  oldSurface.style.viewTransitionName = 'galactrix-tab-content';
  document.documentElement.dataset.tabTransitionDirection = direction;
  container.dataset.tabSwipeViewTransition = 'true';
  const transition = startViewTransition.call(documentWithTransition, () => {
    clearSwipeVisual(container);
    flushSync(() => onSelectionChange(nextKey));
    const nextSurface = transitionSurface(container);
    if (nextSurface) {
      nextSurface.style.viewTransitionName = 'galactrix-tab-content';
    }
  });

  void transition.finished.finally(() => {
    oldSurface.style.removeProperty('view-transition-name');
    transitionSurface(container)?.style.removeProperty('view-transition-name');
    delete document.documentElement.dataset.tabTransitionDirection;
    delete container.dataset.tabSwipeViewTransition;
  });
}

function scrollSelectedTabIntoView(container: HTMLElement) {
  const selectedTab = container.querySelector<HTMLElement>(
    '[role="tab"][aria-selected="true"]',
  );
  const scroller = selectedTab?.closest<HTMLElement>(
    '.tabs__list-container__scroller',
  );
  if (
    !selectedTab ||
    !scroller ||
    scroller.scrollWidth <= scroller.clientWidth
  ) {
    return;
  }

  const selectedRect = selectedTab.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const centeredLeft =
    scroller.scrollLeft +
    selectedRect.left -
    scrollerRect.left -
    (scroller.clientWidth - selectedRect.width) / 2;
  const maxScrollLeft = Math.max(
    0,
    scroller.scrollWidth - scroller.clientWidth,
  );

  scroller.scrollTo({
    left: Math.max(0, Math.min(maxScrollLeft, centeredLeft)),
    behavior: animationsEnabled() ? 'smooth' : 'auto',
  });
}

function setSwipeVisual(container: HTMLElement, offset: number) {
  container.dataset.tabSwipeState = 'dragging';
  container.style.setProperty('--tab-swipe-offset', `${offset}px`);
}

function releaseSwipeVisual(container: HTMLElement) {
  container.dataset.tabSwipeState = 'settling';
  container.style.setProperty('--tab-swipe-offset', '0px');
}

function clearSwipeVisual(container: HTMLElement) {
  delete container.dataset.tabSwipeState;
  delete container.dataset.tabSwipeCommit;
  container.style.removeProperty('--tab-swipe-offset');
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
  const previousSelectedKeyRef = useRef(selectedKey);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const selectionAnimationTimerRef = useRef<number | undefined>(undefined);
  const tabScrollFrameRef = useRef<number | undefined>(undefined);

  keysRef.current = keys;
  selectedKeyRef.current = selectedKey;
  onSelectionChangeRef.current = onSelectionChange;

  useLayoutEffect(() => {
    const previousKey = previousSelectedKeyRef.current;
    previousSelectedKeyRef.current = selectedKey;
    if (previousKey === selectedKey || !isMobilePlatform()) return;

    const container = containerRef.current;
    if (!container) return;
    if (tabScrollFrameRef.current !== undefined) {
      window.cancelAnimationFrame(tabScrollFrameRef.current);
    }
    tabScrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollSelectedTabIntoView(container);
      tabScrollFrameRef.current = undefined;
    });

    const previousIndex = keysRef.current.indexOf(previousKey);
    const nextIndex = keysRef.current.indexOf(selectedKey);
    if (previousIndex < 0 || nextIndex < 0) return;

    if (
      !container.dataset.tabSwipeCommit &&
      !container.dataset.tabSwipeViewTransition
    ) {
      container.dataset.tabSwipeCommit =
        nextIndex > previousIndex ? 'next' : 'previous';
    }
    if (selectionAnimationTimerRef.current !== undefined) {
      window.clearTimeout(selectionAnimationTimerRef.current);
    }
    selectionAnimationTimerRef.current = window.setTimeout(() => {
      delete container.dataset.tabSwipeCommit;
      selectionAnimationTimerRef.current = undefined;
    }, TAB_SWIPE_COMMIT_ANIMATION_MS);
  }, [selectedKey]);

  useEffect(
    () => () => {
      if (selectionAnimationTimerRef.current !== undefined) {
        window.clearTimeout(selectionAnimationTimerRef.current);
      }
      if (tabScrollFrameRef.current !== undefined) {
        window.cancelAnimationFrame(tabScrollFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobilePlatform()) return;

    let gesture: SwipeGesture | undefined;
    const clearGesture = (releaseVisual = false) => {
      gesture = undefined;
      if (releaseVisual) releaseSwipeVisual(container);
    };

    const finishVisual = () => {
      if (selectionAnimationTimerRef.current !== undefined) {
        window.clearTimeout(selectionAnimationTimerRef.current);
      }
      selectionAnimationTimerRef.current = window.setTimeout(() => {
        clearSwipeVisual(container);
        selectionAnimationTimerRef.current = undefined;
      }, TAB_SWIPE_COMMIT_ANIMATION_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        shouldIgnoreSwipeStart(event.target, container)
      ) {
        clearGesture();
        clearSwipeVisual(container);
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) return;

      if (selectionAnimationTimerRef.current !== undefined) {
        window.clearTimeout(selectionAnimationTimerRef.current);
        selectionAnimationTimerRef.current = undefined;
      }
      clearSwipeVisual(container);

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
        if (gesture) {
          clearGesture(true);
          finishVisual();
        }
        return;
      }

      const touch = findTouch(event.touches, gesture.touchId);
      if (!touch) {
        clearGesture(true);
        finishVisual();
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

      if (gesture.direction === 'horizontal') {
        const currentKey = selectedKeyRef.current;
        const candidate = tabKeyAfterSwipe(keysRef.current, currentKey, dx);
        if (candidate === currentKey) {
          clearSwipeVisual(container);
          return;
        }
        setSwipeVisual(container, visualSwipeOffset(dx, container.clientWidth));
        if (event.cancelable) event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture) return;

      const finishedGesture = gesture;
      gesture = undefined;
      if (finishedGesture.direction === 'vertical') return;

      const touch = findTouch(event.changedTouches, finishedGesture.touchId);
      if (!touch) {
        releaseSwipeVisual(container);
        finishVisual();
        return;
      }

      const dx = touch.clientX - finishedGesture.startX;
      const dy = touch.clientY - finishedGesture.startY;
      const elapsedMs = performance.now() - finishedGesture.startedAt;
      const currentKey = selectedKeyRef.current;
      const nextKey = tabKeyAfterSwipe(keysRef.current, currentKey, dx);

      if (nextKey === currentKey) {
        clearSwipeVisual(container);
        return;
      }

      if (shouldCommitTabSwipe(dx, dy, elapsedMs)) {
        commitSelection(
          container,
          nextKey,
          dx < 0 ? 'next' : 'previous',
          onSelectionChangeRef.current,
        );
        finishVisual();
        return;
      }

      releaseSwipeVisual(container);
      finishVisual();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    const onTouchCancel = () => {
      clearGesture(true);
      finishVisual();
    };

    container.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
      clearSwipeVisual(container);
    };
  }, []);

  return containerRef;
}
