import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const usageTimelinePath = new URL(
  '../../src/features/profile/components/UsageTimeline.tsx',
  import.meta.url,
);

test('usage columns stay dense for a week and remain scrollable for longer ranges', async () => {
  const source = await readFile(usageTimelinePath, 'utf8');

  assert.match(source, /isWeeklyRange/);
  assert.match(source, /lg:max-w-4xl/);
  assert.match(source, /lg:w-10/);
  assert.match(
    source,
    /gridTemplateColumns: `repeat\(\$\{displayedUsage\.length\}, minmax\(2\.75rem, 1fr\)\)`/,
  );
  assert.match(source, /usageTimeline\.range\.\$\{value\}/);
  assert.doesNotMatch(source, /w-12 shrink-0 snap-start/);
});
