import { useCallback, useEffect, useRef } from 'react';
import { isMobilePlatform } from '../lib/platform';
import type { TabId } from '../types';
import {
  pushMobileRouteHistoryState,
  replaceMobileRouteHistoryState,
} from './useMobileBackEntry';

const TAB_HISTORY_STATE_KEY = '__galactrixTabEntry';
const tabHistorySessionId = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2)}`;
const tabIds = new Set<TabId>([
  'chats',
  'galaxies',
  'telescope',
  'profile',
  'settings',
]);

type TabHistoryEntry = {
  sessionId: string;
  tab: TabId;
};

function tabHistoryEntry(state: unknown): TabHistoryEntry | undefined {
  if (!state || typeof state !== 'object') return undefined;

  const entry = (state as Record<string, unknown>)[TAB_HISTORY_STATE_KEY];
  if (!entry || typeof entry !== 'object') return undefined;

  const { sessionId, tab } = entry as Record<string, unknown>;
  if (
    typeof sessionId !== 'string' ||
    typeof tab !== 'string' ||
    !tabIds.has(tab as TabId)
  ) {
    return undefined;
  }

  return { sessionId, tab: tab as TabId };
}

function historyStateForTab(tab: TabId) {
  return {
    [TAB_HISTORY_STATE_KEY]: {
      sessionId: tabHistorySessionId,
      tab,
    } satisfies TabHistoryEntry,
  };
}

/** Keeps bottom-navigation destinations inside Android/browser Back history. */
export function useMobileTabHistory(
  activeTab: TabId,
  onHistoryTabChange: (tab: TabId) => void,
) {
  const activeTabRef = useRef(activeTab);
  const onHistoryTabChangeRef = useRef(onHistoryTabChange);

  activeTabRef.current = activeTab;
  onHistoryTabChangeRef.current = onHistoryTabChange;

  useEffect(() => {
    if (!isMobilePlatform()) return;

    const currentEntry = tabHistoryEntry(window.history.state);
    if (currentEntry?.sessionId !== tabHistorySessionId) {
      replaceMobileRouteHistoryState(historyStateForTab(activeTabRef.current));
    }

    const handlePopState = (event: PopStateEvent) => {
      const entry = tabHistoryEntry(event.state);
      if (
        entry?.sessionId !== tabHistorySessionId ||
        entry.tab === activeTabRef.current
      ) {
        return;
      }

      activeTabRef.current = entry.tab;
      onHistoryTabChangeRef.current(entry.tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return useCallback((nextTab: TabId) => {
    if (!isMobilePlatform() || nextTab === activeTabRef.current) return;

    pushMobileRouteHistoryState(historyStateForTab(nextTab));
    activeTabRef.current = nextTab;
  }, []);
}
