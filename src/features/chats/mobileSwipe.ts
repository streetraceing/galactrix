export const MOBILE_SWIPE_ACTIVATION_PX = 4;
export const MOBILE_SWIPE_COMMIT_PX = 30;
export const MOBILE_SWIPE_FLICK_PX = 16;
export const MOBILE_SWIPE_FLICK_VELOCITY = 0.35;

export function isHorizontalSwipeIntent(dx: number, dy: number) {
  return (
    Math.abs(dx) >= MOBILE_SWIPE_ACTIVATION_PX &&
    Math.abs(dx) >= Math.abs(dy) * 0.75
  );
}

export function shouldCommitMobileSwipe(
  dx: number,
  dy: number,
  elapsedMs: number,
) {
  if (!isHorizontalSwipeIntent(dx, dy)) return false;

  const distance = Math.abs(dx);
  if (distance >= MOBILE_SWIPE_COMMIT_PX) return true;

  const velocity = distance / Math.max(1, elapsedMs);
  return (
    distance >= MOBILE_SWIPE_FLICK_PX && velocity >= MOBILE_SWIPE_FLICK_VELOCITY
  );
}

export function mobileSwipeDragOffset(dx: number, hasTarget: boolean) {
  const resistance = hasTarget ? 0.82 : 0.18;
  return Math.max(-112, Math.min(112, dx * resistance));
}
