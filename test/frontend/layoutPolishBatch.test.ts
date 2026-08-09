import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('fullscreen composer exposes the same formatting and draft tools', async () => {
  const source = await read('src/features/chats/components/ChatComposer.tsx');
  const fullscreen = source.slice(
    source.indexOf("title={t('chatComposer.fullscreenTitle')}"),
  );

  for (const action of ['roleplay', 'bold', 'quote', 'ooc', 'copy', 'clear']) {
    assert.match(fullscreen, new RegExp(`runToolAction\\('${action}'`));
  }
  assert.match(
    fullscreen,
    /rounded-xl border border-separator bg-default\/30 p-2/,
  );
});

test('weekly usage chart is constrained on wide screens', async () => {
  const source = await read(
    'src/features/profile/components/UsageTimeline.tsx',
  );
  assert.match(source, /const isWeeklyRange = range === 'week'/);
  assert.match(source, /lg:max-w-4xl/);
  assert.match(source, /lg:overflow-x-hidden/);
  assert.match(source, /lg:w-10/);
});

test('Galaxy libraries use full-width information rows instead of desktop grids', async () => {
  const [screen, card] = await Promise.all([
    read('src/features/galaxies/GalaxiesScreen.tsx'),
    read('src/features/galaxies/components/GalaxyCard.tsx'),
  ]);

  assert.match(screen, /className="flex flex-col gap-3"/);
  assert.doesNotMatch(screen, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(card, /sm:min-w-44/);
  assert.match(card, /details\.map/);
  assert.match(card, /details\.map\(\(detail\) => \(\s*<Chip\s+key=\{detail\}/);
  assert.doesNotMatch(card, /line-clamp-3/);
});

test('Telescope uses full-width provider rows and balanced metric padding', async () => {
  const [screen, card, metrics] = await Promise.all([
    read('src/features/telescope/TelescopeScreen.tsx'),
    read('src/features/telescope/components/ProviderCard.tsx'),
    read('src/components/ui/MetricGrid.tsx'),
  ]);

  assert.match(screen, /className="flex flex-col gap-3"/);
  assert.doesNotMatch(screen, /md:grid-cols-2/);
  assert.match(card, /function ProviderFact/);
  assert.match(card, /providerCard\.maxOutput/);
  assert.match(card, /providerCard\.sampling/);
  assert.match(card, /providerCard\.embedding/);
  assert.match(metrics, /metric-enter min-w-0 p-5/);
  assert.doesNotMatch(metrics, /pt-4 pb-5/);
});
