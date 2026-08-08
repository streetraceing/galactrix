import assert from 'node:assert/strict';
import test from 'node:test';
import {
  usageForRange,
  usageSummary,
} from '../../src/features/profile/usageStats';
import type { UsagePoint } from '../../src/types';

const usage: UsagePoint[] = Array.from({ length: 35 }, (_, index) => ({
  day: index + 1,
  inputTokens: index * 10,
  outputTokens: index * 5,
  tokens: index * 15,
  requests: index % 4,
}));

test('usage range keeps the newest 7 or 30 points and can expose all data', () => {
  assert.deepEqual(
    usageForRange(usage, 'week').map((point) => point.day),
    [29, 30, 31, 32, 33, 34, 35],
  );
  assert.equal(usageForRange(usage, 'month').length, 30);
  assert.equal(usageForRange(usage, 'all').length, 35);
});

test('usage summary reports total average peak and active days', () => {
  const sample = usage.slice(0, 4);
  const summary = usageSummary(sample, 'requests');
  assert.equal(summary.total, 6);
  assert.equal(summary.average, 1.5);
  assert.equal(summary.activeDays, 3);
  assert.equal(summary.peak?.day, 4);
});
