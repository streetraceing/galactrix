import type { Message } from '../../types';

export type ChatStats = {
  total: number;
  userCount: number;
  assistantCount: number;
  systemCount: number;
  reportedInputTokens: number;
  reportedOutputTokens: number;
  estimatedTokens: number;
  avgLatencyMs: number | null;
  activeDays: Array<{ dayKey: string; count: number }>;
  firstMessageAt: number | null;
  lastMessageAt: number | null;
};

function localDayKey(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1_000);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/// Aggregates a conversation's messages into presentation-ready statistics.
/// Token totals prefer provider-reported usage from generation reports and
/// fall back to the per-response estimates.
export function buildChatStats(messages: Message[]): ChatStats {
  const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  let userCount = 0;
  let assistantCount = 0;
  let systemCount = 0;
  let reportedInputTokens = 0;
  let reportedOutputTokens = 0;
  let estimatedTokens = 0;
  let latencySum = 0;
  let latencyCount = 0;
  const dayCounts = new Map<string, number>();

  for (const message of ordered) {
    if (message.role === 'user') userCount += 1;
    else if (message.role === 'assistant') assistantCount += 1;
    else systemCount += 1;

    const dayKey = localDayKey(message.createdAt);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);

    if (message.role !== 'assistant') continue;
    const report = message.variants.find(
      (variant) => variant.index === message.activeVariantIndex,
    )?.report;
    if (!report) continue;
    if (report.reportedUsage) {
      reportedInputTokens += report.reportedUsage.inputTokens;
      reportedOutputTokens += report.reportedUsage.outputTokens;
    } else {
      estimatedTokens += report.estimatedTokens.totalTokens;
    }
    if (report.latencyMs != null) {
      latencySum += report.latencyMs;
      latencyCount += 1;
    }
  }

  const activeDays = [...dayCounts.entries()]
    .map(([dayKey, count]) => ({ dayKey, count }))
    .sort((a, b) => b.count - a.count);

  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  return {
    total: ordered.length,
    userCount,
    assistantCount,
    systemCount,
    reportedInputTokens,
    reportedOutputTokens,
    estimatedTokens,
    avgLatencyMs:
      latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
    activeDays,
    firstMessageAt: first?.createdAt ?? null,
    lastMessageAt: last?.createdAt ?? null,
  };
}
