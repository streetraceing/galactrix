import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMobileBackEntry } from './useMobileBackEntry';

export function toggleContextSelection(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function pruneContextSelection(
  current: Set<string>,
  availableIds: Iterable<string>,
) {
  const available = new Set(availableIds);
  const next = new Set([...current].filter((id) => available.has(id)));
  return next.size === current.size ? current : next;
}

export function useContextSelection(availableIds: readonly string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const availableKey = availableIds.join('\u0000');

  useEffect(() => {
    setSelectedIds((current) => pruneContextSelection(current, availableIds));
  }, [availableKey, availableIds]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const start = useCallback((id: string) => {
    setSelectedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);
  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => toggleContextSelection(current, id));
  }, []);
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(availableIds));
  }, [availableKey, availableIds]);

  useMobileBackEntry(selectedIds.size > 0, clear);

  return useMemo(
    () => ({
      selectedIds,
      active: selectedIds.size > 0,
      clear,
      start,
      toggle,
      selectAll,
    }),
    [clear, selectAll, selectedIds, start, toggle],
  );
}
