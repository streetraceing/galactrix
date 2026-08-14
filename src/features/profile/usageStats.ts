import type { UsagePoint } from '../../types';

export type UsageMetric = 'tokens' | 'requests';
export type UsageRange = 'week' | 'month' | 'all';

export function usageValue(point: UsagePoint, metric: UsageMetric) {
  return metric === 'tokens' ? point.tokens : point.requests;
}

export function usageForRange(
  usage: readonly UsagePoint[],
  range: UsageRange,
): UsagePoint[] {
  const count = range === 'week' ? 7 : range === 'month' ? 30 : usage.length;
  return usage.slice(Math.max(0, usage.length - count));
}

export function usageSummary(
  usage: readonly UsagePoint[],
  metric: UsageMetric,
) {
  let total = 0;
  let activeDays = 0;
  let peak: UsagePoint | undefined;

  for (const point of usage) {
    const value = usageValue(point, metric);
    total += value;
    if (value > 0) activeDays += 1;
    if (!peak || value > usageValue(peak, metric)) peak = point;
  }

  return {
    total,
    activeDays,
    average: usage.length > 0 ? total / usage.length : 0,
    peak,
  };
}
