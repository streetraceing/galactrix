import { pluralRu } from '../../lib/plural';
import { formatNumber } from '../../i18n';

export function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return formatNumber(value);
}

export function formatTokenCount(value: number) {
  const suffix = pluralRu(value, ['токен', 'токена', 'токенов']);
  return `${formatTokens(value)} ${suffix}`;
}
