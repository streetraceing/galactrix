import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  isHorizontalTabSwipeIntent,
  shouldCommitTabSwipe,
  tabKeyAfterSwipe,
} from '../../src/lib/tabSwipe.ts';

const swipeHookPath = new URL(
  '../../src/hooks/useSwipeableTabs.ts',
  import.meta.url,
);
const profilePath = new URL(
  '../../src/features/profile/ProfileScreen.tsx',
  import.meta.url,
);
const settingsPath = new URL(
  '../../src/features/settings/SettingsScreen.tsx',
  import.meta.url,
);
const galaxiesPath = new URL(
  '../../src/features/galaxies/GalaxiesScreen.tsx',
  import.meta.url,
);
const uiModalPath = new URL(
  '../../src/components/ui/UiModal.tsx',
  import.meta.url,
);
const appCssPath = new URL('../../src/App.css', import.meta.url);

test('tab swipes require horizontal intent and move one adjacent section', () => {
  const keys = ['first', 'second', 'third'] as const;

  assert.equal(isHorizontalTabSwipeIntent(60, 18), true);
  assert.equal(isHorizontalTabSwipeIntent(18, 60), false);
  assert.equal(shouldCommitTabSwipe(54, 16, 400), true);
  assert.equal(shouldCommitTabSwipe(30, 8, 50), true);
  assert.equal(shouldCommitTabSwipe(24, 4, 50), false);
  assert.equal(tabKeyAfterSwipe(keys, 'second', -60), 'third');
  assert.equal(tabKeyAfterSwipe(keys, 'second', 60), 'first');
  assert.equal(tabKeyAfterSwipe(keys, 'first', 60), 'first');
});

test('tab swipe listener protects controls and horizontal scrollers', async () => {
  const source = await readFile(swipeHookPath, 'utf8');

  assert.match(source, /INTERACTIVE_SELECTOR/);
  assert.match(source, /\[role=\\?"tab\\?"\]/);
  assert.match(source, /data-tab-swipe-ignore/);
  assert.match(source, /\[role="tablist"\]/);
  assert.match(source, /tabs__list-container__scroller/);
  assert.match(source, /scrollWidth <= element\.clientWidth \+ 1/);
  assert.match(source, /overflowX === 'auto' \|\| overflowX === 'scroll'/);
  assert.match(source, /touchmove', onTouchMove, \{ passive: false \}/);
  assert.match(source, /event\.preventDefault\(\)/);
});

test('every screen using HeroUI tabs enables full-screen mobile swiping', async () => {
  const sources = await Promise.all(
    [profilePath, settingsPath, galaxiesPath].map((path) =>
      readFile(path, 'utf8'),
    ),
  );

  for (const source of sources) {
    assert.match(source, /useSwipeableTabs\(\{/);
    assert.match(source, /ref=\{swipeRef\}/);
    assert.match(source, /className="page-scroll mobile-screen-enter flex-1"/);
  }
});

test('phone page and modal gutters use compact responsive spacing', async () => {
  const [modalSource, cssSource] = await Promise.all([
    readFile(uiModalPath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);

  assert.match(
    cssSource,
    /\.page-container\s*\{[\s\S]*?@apply[^;]*px-2[^;]*sm:px-6/,
  );
  assert.match(modalSource, /ui-modal-mobile-header[^"']*px-2/);
  assert.match(modalSource, /ui-modal-mobile-body[^`]*px-2/);
  assert.match(modalSource, /ui-modal-mobile-footer[^"']*px-2/);
});
