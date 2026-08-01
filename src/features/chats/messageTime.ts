export function formatMessageTime(timestampSeconds: number) {
  if (!Number.isFinite(timestampSeconds)) return '';

  return new Date(timestampSeconds * 1_000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
