import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageHeaderPath = new URL(
  '../../src/components/ui/PageHeader.tsx',
  import.meta.url,
);
const appCssPath = new URL('../../src/App.css', import.meta.url);
const settingsCardPath = new URL(
  '../../src/features/profile/components/SettingsCard.tsx',
  import.meta.url,
);
const chatPreferencesPath = new URL(
  '../../src/features/profile/components/ChatPreferences.tsx',
  import.meta.url,
);
const usageTimelinePath = new URL(
  '../../src/features/profile/components/UsageTimeline.tsx',
  import.meta.url,
);

test('mobile page headers share one compact centered title area', async () => {
  const [componentSource, cssSource] = await Promise.all([
    readFile(pageHeaderPath, 'utf8'),
    readFile(appCssPath, 'utf8'),
  ]);

  assert.doesNotMatch(componentSource, /h-52/);
  assert.match(componentSource, /page-header-copy/);
  assert.match(componentSource, /text-center md:text-left/);
  assert.match(
    cssSource,
    /\.page-header-copy\s*\{[\s\S]*?@apply h-22 min-h-22 max-h-22/,
  );
  assert.match(
    cssSource,
    /\.page-description\s*\{[\s\S]*?@apply[^;]*text-center/,
  );
});

test('mobile settings constrain intrinsic widths', async () => {
  const [cssSource, cardSource, chatSource] = await Promise.all([
    readFile(appCssPath, 'utf8'),
    readFile(settingsCardPath, 'utf8'),
    readFile(chatPreferencesPath, 'utf8'),
  ]);

  assert.match(
    cssSource,
    /\.page-container\s*\{[\s\S]*?min-w-0[\s\S]*?max-w-full[\s\S]*?overflow-x-clip/,
  );
  assert.match(cardSource, /w-full min-w-0 max-w-full overflow-hidden/);
  assert.match(chatSource, /flex flex-col gap-2 sm:flex-row/);
  assert.match(
    chatSource,
    /className="min-w-0 max-w-full"|className="w-full min-w-0 max-w-full"/,
  );
});

test('usage statistic chips stack before the desktop breakpoint', async () => {
  const source = await readFile(usageTimelinePath, 'utf8');

  assert.match(source, /flex flex-col gap-2[^"']*sm:flex-row/);
  assert.match(source, /w-full justify-center[^"']*sm:flex-1/);
});

test('mobile page headers are explicitly non-sticky', async () => {
  const cssSource = await readFile(appCssPath, 'utf8');

  assert.match(
    cssSource,
    /@media \(max-width: 820px\)[\s\S]*?\.page-header\s*\{[\s\S]*?@apply static! inset-auto!/,
  );
});
