export const TAB_SWIPE_ACTIVATION_PX = 10;
export const TAB_SWIPE_COMMIT_PX = 52;
export const TAB_SWIPE_FLICK_PX = 28;
export const TAB_SWIPE_FLICK_VELOCITY = 0.45;

export function isHorizontalTabSwipeIntent(dx: number, dy: number) {
  return (
    Math.abs(dx) >= TAB_SWIPE_ACTIVATION_PX &&
    Math.abs(dx) > Math.abs(dy) * 1.15
  );
}

export function shouldCommitTabSwipe(
  dx: number,
  dy: number,
  elapsedMs: number,
) {
  if (!isHorizontalTabSwipeIntent(dx, dy)) return false;

  const distance = Math.abs(dx);
  if (distance >= TAB_SWIPE_COMMIT_PX) return true;

  const velocity = distance / Math.max(1, elapsedMs);
  return distance >= TAB_SWIPE_FLICK_PX && velocity >= TAB_SWIPE_FLICK_VELOCITY;
}

export function tabKeyAfterSwipe<T extends string>(
  keys: readonly T[],
  currentKey: T,
  dx: number,
) {
  const currentIndex = keys.indexOf(currentKey);
  if (currentIndex < 0 || dx === 0) return currentKey;

  const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
  return keys[nextIndex] ?? currentKey;
}
