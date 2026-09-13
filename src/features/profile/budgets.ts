import type { BudgetStatus } from '../../types';

/// Budget rules that are currently over their ceiling and apply to the given
/// provider: global rules always apply, provider-scoped ones only on match.
export function budgetsExceeded(
  statuses: BudgetStatus[],
  providerId: string | undefined,
): BudgetStatus[] {
  return statuses.filter(
    (status) =>
      status.exceeded &&
      (status.providerId == null || status.providerId === providerId),
  );
}

export function budgetPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
