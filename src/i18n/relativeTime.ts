import type { AppLocale } from './resources';

export function formatRelativeTimeForLocale(
  timestampSeconds: number,
  nowSeconds: number,
  locale: AppLocale,
) {
  const elapsedSeconds = timestampSeconds - nowSeconds;
  const absoluteSeconds = Math.abs(elapsedSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
    style: 'short',
  });

  if (absoluteSeconds < 60) return formatter.format(0, 'second');
  if (absoluteSeconds < 3_600) {
    return formatter.format(Math.round(elapsedSeconds / 60), 'minute');
  }
  if (absoluteSeconds < 86_400) {
    return formatter.format(Math.round(elapsedSeconds / 3_600), 'hour');
  }
  return formatter.format(Math.round(elapsedSeconds / 86_400), 'day');
}
