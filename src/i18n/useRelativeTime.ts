import { useSyncExternalStore } from 'react';
import { formatRelativeTime } from './index';

const UPDATE_INTERVAL_MS = 15_000;
const listeners = new Set<() => void>();
let intervalId: number | null = null;

function emitClockChange() {
  for (const listener of listeners) listener();
}

function startClock() {
  if (intervalId !== null || typeof window === 'undefined') return;
  intervalId = window.setInterval(emitClockChange, UPDATE_INTERVAL_MS);
  document.addEventListener('visibilitychange', emitClockChange);
}

function stopClock() {
  if (intervalId === null || typeof window === 'undefined') return;
  window.clearInterval(intervalId);
  intervalId = null;
  document.removeEventListener('visibilitychange', emitClockChange);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startClock();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopClock();
  };
}

function getClockSnapshot() {
  return Math.floor(Date.now() / UPDATE_INTERVAL_MS);
}

export function useRelativeTime(timestampSeconds: number) {
  const clockTick = useSyncExternalStore(
    subscribe,
    getClockSnapshot,
    getClockSnapshot,
  );
  const nowSeconds = Math.floor((clockTick * UPDATE_INTERVAL_MS) / 1_000);
  return formatRelativeTime(timestampSeconds, nowSeconds);
}
