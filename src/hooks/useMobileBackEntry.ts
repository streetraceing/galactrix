import { useEffect, useRef } from 'react';
import { isMobilePlatform } from '../lib/platform';

const HISTORY_STATE_KEY = '__galactrixBackEntry';
let nextEntryId = 0;

function historyEntryId(state: unknown) {
  if (!state || typeof state !== 'object') return undefined;
  return (state as Record<string, unknown>)[HISTORY_STATE_KEY];
}

/**
 * Adds one native-friendly history entry while a mobile view or overlay is open.
 * Tauri's Android activity delegates Back to WebView.goBack(), so popstate is
 * the shared exit path for the system gesture, header buttons and modal closes.
 */
export function useMobileBackEntry(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active || !isMobilePlatform()) return;

    const entryId = `galactrix-${++nextEntryId}`;
    const previousState =
      window.history.state && typeof window.history.state === 'object'
        ? window.history.state
        : {};
    let ownsEntry = true;

    window.history.pushState(
      { ...previousState, [HISTORY_STATE_KEY]: entryId },
      '',
    );

    const handlePopState = (event: PopStateEvent) => {
      if (!ownsEntry || historyEntryId(event.state) === entryId) return;
      ownsEntry = false;
      onBackRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (ownsEntry && historyEntryId(window.history.state) === entryId) {
        ownsEntry = false;
        window.history.back();
      }
    };
  }, [active]);
}
