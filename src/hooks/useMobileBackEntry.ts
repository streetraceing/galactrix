import { useEffect, useRef } from 'react';
import { isMobilePlatform } from '../lib/platform';

const HISTORY_STATE_KEY = '__galactrixBackEntry';
const historySessionId = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2)}`;
let nextEntryId = 0;
const activeEntries = new Map<string, () => void>();
const retiredEntries = new Set<string>();
const removalTimers = new Map<string, number>();
let knownHistoryEntryId: string | undefined;
let listenerInstalled = false;

function historyEntryId(state: unknown) {
  if (!state || typeof state !== 'object') return undefined;
  const value = (state as Record<string, unknown>)[HISTORY_STATE_KEY];
  return typeof value === 'string' ? value : undefined;
}

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {};
}

function routeHistoryState(extraState: Record<string, unknown>) {
  const nextState = { ...currentHistoryState(), ...extraState };
  delete nextState[HISTORY_STATE_KEY];
  return nextState;
}

function prepareForRouteHistoryChange() {
  installGlobalListener();
  const entryId = historyEntryId(window.history.state);
  if (entryId) {
    activeEntries.delete(entryId);
    retiredEntries.add(entryId);
  }
  knownHistoryEntryId = undefined;
}

export function replaceMobileRouteHistoryState(
  extraState: Record<string, unknown>,
) {
  prepareForRouteHistoryChange();
  window.history.replaceState(routeHistoryState(extraState), '');
}

export function pushMobileRouteHistoryState(
  extraState: Record<string, unknown>,
) {
  prepareForRouteHistoryChange();
  window.history.pushState(routeHistoryState(extraState), '');
}

function resetStaleHistoryEntry() {
  const state = currentHistoryState();
  const entryId = historyEntryId(state);
  if (!entryId || entryId.startsWith(`galactrix-${historySessionId}-`)) return;

  const nextState = { ...state };
  delete nextState[HISTORY_STATE_KEY];
  window.history.replaceState(nextState, '');
}

function removeRetiredEntryIfNeeded(entryId: string | undefined) {
  if (!entryId || !retiredEntries.has(entryId)) return;
  retiredEntries.delete(entryId);
  window.setTimeout(() => {
    if (historyEntryId(window.history.state) === entryId) {
      window.history.back();
    }
  }, 0);
}

function installGlobalListener() {
  if (listenerInstalled || typeof window === 'undefined') return;
  listenerInstalled = true;
  resetStaleHistoryEntry();
  knownHistoryEntryId = historyEntryId(window.history.state);

  window.addEventListener('popstate', (event) => {
    const previousEntryId = knownHistoryEntryId;
    const nextEntryId = historyEntryId(event.state);
    knownHistoryEntryId = nextEntryId;

    if (previousEntryId) {
      const callback = activeEntries.get(previousEntryId);
      if (callback) {
        activeEntries.delete(previousEntryId);
        callback();
      } else {
        retiredEntries.delete(previousEntryId);
      }
    }

    // Multiple nested layers may disappear in one React commit. In that case
    // the browser can land on a history entry whose UI is already gone. Skip
    // that stale entry instead of letting the next active layer consume Back.
    removeRetiredEntryIfNeeded(nextEntryId);
  });
}

function installHistoryEntry(entryId: string) {
  installGlobalListener();
  window.history.pushState(
    { ...currentHistoryState(), [HISTORY_STATE_KEY]: entryId },
    '',
  );
  knownHistoryEntryId = entryId;
}

function scheduleHistoryEntryRemoval(entryId: string) {
  retiredEntries.add(entryId);
  const previousTimer = removalTimers.get(entryId);
  if (previousTimer !== undefined) window.clearTimeout(previousTimer);

  const timer = window.setTimeout(() => {
    removalTimers.delete(entryId);
    if (historyEntryId(window.history.state) === entryId) {
      window.history.back();
    }
  }, 0);
  removalTimers.set(entryId, timer);
}

/**
 * Adds one native-friendly history entry while a mobile view or overlay is open.
 * Retired nested entries are skipped automatically, so closing a confirmation
 * modal and its parent interaction mode in the same commit cannot accidentally
 * consume the chat/page back entry underneath them.
 */
export function useMobileBackEntry(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active || !isMobilePlatform()) return;

    const entryId = `galactrix-${historySessionId}-${++nextEntryId}`;
    activeEntries.set(entryId, () => onBackRef.current());
    retiredEntries.delete(entryId);
    installHistoryEntry(entryId);

    return () => {
      activeEntries.delete(entryId);
      scheduleHistoryEntryRemoval(entryId);
    };
  }, [active]);
}
