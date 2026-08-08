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
  const total = usage.reduce(
    (sum, point) => sum + usageValue(point, metric),
    0,
  );
  const activeDays = usage.filter(
    (point) => usageValue(point, metric) > 0,
  ).length;
  const peak = usage.reduce<UsagePoint | undefined>((best, point) => {
    if (!best || usageValue(point, metric) > usageValue(best, metric)) {
      return point;
    }
    return best;
  }, undefined);

  return {
    total,
    activeDays,
    average: usage.length > 0 ? total / usage.length : 0,
    peak,
  };
}
