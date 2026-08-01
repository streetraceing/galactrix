export const INITIAL_VISIBLE_MESSAGES = 16;
export const MESSAGE_WINDOW_BATCH = 20;

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
