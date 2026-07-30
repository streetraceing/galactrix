export const INITIAL_VISIBLE_MESSAGES = 48;
export const MESSAGE_WINDOW_BATCH = 40;
export const MESSAGE_WINDOW_ARM_SCROLL_TOP = 160;
export const MESSAGE_WINDOW_LOAD_SCROLL_TOP = 48;

export function initialMessageWindowStart(
  messageCount: number,
  initialCount = INITIAL_VISIBLE_MESSAGES,
) {
  return Math.max(0, messageCount - Math.max(1, initialCount));
}

export function previousMessageWindowStart(
  currentStart: number,
  batchSize = MESSAGE_WINDOW_BATCH,
) {
  return Math.max(0, currentStart - Math.max(1, batchSize));
}

export function messageWindowScrollState(scrollTop: number, armed: boolean) {
  if (scrollTop > MESSAGE_WINDOW_ARM_SCROLL_TOP) {
    return { armed: true, shouldLoad: false };
  }
  if (scrollTop <= MESSAGE_WINDOW_LOAD_SCROLL_TOP && armed) {
    return { armed: false, shouldLoad: true };
  }
  return { armed, shouldLoad: false };
}
