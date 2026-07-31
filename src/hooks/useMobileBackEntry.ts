import { useEffect, useRef } from 'react';
import { isMobilePlatform } from '../lib/platform';

const HISTORY_STATE_KEY = '__galactrixBackEntry';
let nextEntryId = 0;
let pendingHistoryBack:
  | {
      entryId: string;
      timer: number;
    }
  | undefined;

function historyEntryId(state: unknown) {
  if (!state || typeof state !== 'object') return undefined;
  return (state as Record<string, unknown>)[HISTORY_STATE_KEY];
}

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {};
}

function installHistoryEntry(entryId: string) {
  const currentEntryId = historyEntryId(window.history.state);
  if (pendingHistoryBack && currentEntryId === pendingHistoryBack.entryId) {
    window.clearTimeout(pendingHistoryBack.timer);
    pendingHistoryBack = undefined;
    window.history.replaceState(
      { ...currentHistoryState(), [HISTORY_STATE_KEY]: entryId },
      '',
    );
    return;
  }

  window.history.pushState(
    { ...currentHistoryState(), [HISTORY_STATE_KEY]: entryId },
    '',
  );
}

function scheduleHistoryEntryRemoval(entryId: string) {
  if (historyEntryId(window.history.state) !== entryId) return;

  if (pendingHistoryBack) {
    window.clearTimeout(pendingHistoryBack.timer);
  }

  const timer = window.setTimeout(() => {
    if (pendingHistoryBack?.entryId !== entryId) return;
    pendingHistoryBack = undefined;
    if (historyEntryId(window.history.state) === entryId) {
      window.history.back();
    }
  }, 0);

  pendingHistoryBack = { entryId, timer };
}

/**
 * Adds one native-friendly history entry while a mobile view or overlay is open.
 * Consecutive overlays reuse the same pending entry, so closing one modal and
 * opening another in the same React commit cannot pop and immediately close the
 * newly opened modal on Android.
 */
export function useMobileBackEntry(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active || !isMobilePlatform()) return;

    const entryId = `galactrix-${++nextEntryId}`;
    let ownsEntry = true;
    installHistoryEntry(entryId);

    const handlePopState = (event: PopStateEvent) => {
      if (!ownsEntry || historyEntryId(event.state) === entryId) return;
      ownsEntry = false;
      onBackRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (ownsEntry) {
        ownsEntry = false;
        scheduleHistoryEntryRemoval(entryId);
      }
    };
  }, [active]);
}
