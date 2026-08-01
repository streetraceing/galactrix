export function formatMessageTime(
  timestampSeconds: number,
  interfaceLanguage: string,
) {
  if (!Number.isFinite(timestampSeconds)) return '';

  const isRussian = interfaceLanguage.toLowerCase().startsWith('ru');
  return new Intl.DateTimeFormat(isRussian ? 'ru-RU' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: isRussian ? 'h23' : 'h12',
  }).format(new Date(timestampSeconds * 1_000));
}
