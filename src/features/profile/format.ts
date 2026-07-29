import { pluralRu } from '../../lib/plural';

export function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString('ru-RU');
}

export function formatTokenCount(value: number) {
  const suffix =
    Math.abs(value) >= 1_000
      ? 'токенов'
      : pluralRu(value, ['токен', 'токена', 'токенов']);
  return `${formatTokens(value)} ${suffix}`;
}
