export const MOTION_DURATION_MS = {
  instant: 100,
  fast: 160,
  standard: 240,
  slow: 360,
  emphasis: 480,
} as const;

export const MOTION_EASING = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const MOTION_STAGGER_MS = 40;
export const TYPING_DOT_CYCLE_MS = 1_200;
export const TYPING_DOT_STAGGER_MS = 120;

export function animationsEnabled() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.dataset.animations === 'off') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function nextMotionFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function waitForMotion(duration: number) {
  if (!animationsEnabled()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

export async function finishMotion(animation: Animation | null) {
  if (!animation) return;
  try {
    await animation.finished;
  } catch {
    // A rerender or navigation may legitimately cancel an in-flight animation.
  }
}
