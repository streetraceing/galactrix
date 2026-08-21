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

export function messageDateKey(timestampSeconds: number) {
  const date = new Date(timestampSeconds * 1_000);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatMessageDate(
  timestampSeconds: number,
  interfaceLanguage: string,
) {
  if (!Number.isFinite(timestampSeconds)) return '';
  const isRussian = interfaceLanguage.toLowerCase().startsWith('ru');
  return new Intl.DateTimeFormat(isRussian ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestampSeconds * 1_000));
}
