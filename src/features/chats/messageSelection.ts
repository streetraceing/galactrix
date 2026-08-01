export function messageSelectionRange(
  orderedIds: readonly string[],
  startId: string,
  endId: string,
) {
  const startIndex = orderedIds.indexOf(startId);
  const endIndex = orderedIds.indexOf(endId);
  if (startIndex < 0 || endIndex < 0) return [startId];

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return orderedIds.slice(from, to + 1);
}

export function mergeMessageSelection(
  baseSelection: ReadonlySet<string>,
  range: readonly string[],
) {
  const next = new Set(baseSelection);
  for (const id of range) next.add(id);
  return next;
}

export function toggleMessageSelection(
  selection: ReadonlySet<string>,
  messageId: string,
) {
  const next = new Set(selection);
  if (next.has(messageId)) next.delete(messageId);
  else next.add(messageId);
  return next;
}

export function addMessageSelection(
  selection: ReadonlySet<string>,
  messageId: string,
) {
  if (selection.has(messageId)) return new Set(selection);
  const next = new Set(selection);
  next.add(messageId);
  return next;
}

export function shouldStartMessageRangeSelection(
  startId: string,
  endId: string,
  deltaX: number,
  deltaY: number,
  threshold: number,
) {
  if (endId !== startId) return true;
  return deltaY <= -threshold && Math.abs(deltaY) > Math.abs(deltaX);
}
