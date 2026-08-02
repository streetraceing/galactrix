const MIN_DISMISS_DISTANCE = 56;
const MAX_DISMISS_DISTANCE = 96;
const DISMISS_WIDTH_RATIO = 0.22;

export function toastSwipeDismissDistance(width: number) {
  return Math.min(
    MAX_DISMISS_DISTANCE,
    Math.max(MIN_DISMISS_DISTANCE, width * DISMISS_WIDTH_RATIO),
  );
}

export function shouldDismissToastSwipe(deltaX: number, width: number) {
  return Math.abs(deltaX) >= toastSwipeDismissDistance(width);
}

export function toastSwipeOpacity(deltaX: number, width: number) {
  if (width <= 0) return 1;
  return Math.max(0.35, 1 - (Math.abs(deltaX) / width) * 0.8);
}
