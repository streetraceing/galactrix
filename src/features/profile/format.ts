import { formatNumber, i18next } from '../../i18n';

export function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return formatNumber(value);
}

export function formatTokenCount(value: number) {
  return i18next.t('count.tokenCompact', {
    count: value,
    value: formatTokens(value),
  });
}
