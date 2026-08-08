export type ScrollGeometry = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const BOTTOM_LOCK_PX = 24;

export function restoredScrollTop(
  before: ScrollGeometry,
  after: Pick<ScrollGeometry, 'scrollHeight' | 'clientHeight'>,
) {
  const beforeMax = Math.max(0, before.scrollHeight - before.clientHeight);
  const afterMax = Math.max(0, after.scrollHeight - after.clientHeight);
  if (beforeMax <= 0 || afterMax <= 0 || before.scrollTop <= 0) return 0;

  const distanceFromBottom = beforeMax - before.scrollTop;
  if (distanceFromBottom <= BOTTOM_LOCK_PX) return afterMax;

  const progress = Math.min(1, Math.max(0, before.scrollTop / beforeMax));
  return afterMax * progress;
}
