import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('mobile screens keep banners readable and actions inside the viewport', async () => {
  const [health, dataManagement, tabs] = await Promise.all([
    read('src/features/settings/components/DataHealthCenter.tsx'),
    read('src/features/settings/components/DataManagement.tsx'),
    read('src/components/ui/AppTabList.tsx'),
  ]);

  // Translucent tinted banners use the color itself for text; the
  // *-foreground tokens are dark and unreadable on a /10 background.
  assert.doesNotMatch(health, /warning-foreground|success-foreground/);
  assert.doesNotMatch(dataManagement, /bg-warning\/10[^;]*warning-foreground/);
  assert.match(health, /text-success">\s*\{t\('dataHealth\.statusOk'\)\}/);
  // Header actions stack on narrow screens instead of overflowing sideways.
  assert.match(
    health,
    /flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row/,
  );
  // Tab chevrons hide at both scroll edges with a fractional-pixel tolerance.
  assert.match(tabs, /scrollWidth - EDGE_TOLERANCE/);
  assert.match(
    tabs,
    /prev\.style\.visibility = canScrollPrev \? '' : 'hidden'/,
  );
});

test('the android keyboard overlays the content instead of resizing it', async () => {
  const [manifest, mainActivity] = await Promise.all([
    read('src-tauri/gen/android/app/src/main/AndroidManifest.xml'),
    read(
      'src-tauri/gen/android/app/src/main/java/ru/streetraceing/galactrix/MainActivity.kt',
    ),
  ]);

  assert.match(manifest, /windowSoftInputMode="adjustPan"/);
  assert.doesNotMatch(manifest, /adjustResize/);
  // The insets listener must not pad the content by the keyboard height.
  assert.doesNotMatch(mainActivity, /Type\.ime\(\)/);
  assert.doesNotMatch(mainActivity, /keyboardArea/);
});
