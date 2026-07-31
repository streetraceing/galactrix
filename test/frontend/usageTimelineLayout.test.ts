import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const usageTimelinePath = new URL(
  '../../src/features/profile/components/UsageTimeline.tsx',
  import.meta.url,
);

test('desktop usage columns fill the available chart width', async () => {
  const source = await readFile(usageTimelinePath, 'utf8');

  assert.match(source, /grid h-full min-w-full/);
  assert.match(
    source,
    /gridTemplateColumns: `repeat\(\$\{usage\.length\}, minmax\(2\.75rem, 1fr\)\)`/,
  );
  assert.doesNotMatch(source, /w-12 shrink-0 snap-start/);
});
