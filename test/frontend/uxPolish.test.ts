import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { restoredScrollTop } from '../../src/lib/scaleScroll.ts';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('required fields expose a consistent danger asterisk', async () => {
  const [mark, chat, galaxy, provider, promptBlocks, character] =
    await Promise.all([
      read('src/components/ui/RequiredMark.tsx'),
      read('src/features/chats/components/ChatSetupModal.tsx'),
      read('src/features/galaxies/components/GalaxyEditorModal.tsx'),
      read('src/features/telescope/components/ProviderCredentials.tsx'),
      read(
        'src/features/chats/components/prompt-builder/PromptCustomBlocksSection.tsx',
      ),
      read('src/features/galaxies/components/editors/CharacterEditor.tsx'),
    ]);

  assert.match(mark, /text-danger/);
  assert.match(mark, />\s*\*\s*</);
  assert.match(chat, /chat-title[\s\S]*?required/);
  assert.match(galaxy, /galaxy-name[\s\S]*?required/);
  assert.match(provider, /providerCredentials\.name'[\s\S]*?required/);
  assert.match(promptBlocks, /required=\{block\.enabled\}/);
  assert.match(character, /characterEditor\.savedStyle/);
  assert.doesNotMatch(character, /<RequiredMark/);
});

test('mobile tab swipes follow the finger without moving past an edge', async () => {
  const [hook, css] = await Promise.all([
    read('src/hooks/useSwipeableTabs.ts'),
    read('src/App.css'),
  ]);

  assert.match(hook, /TAB_SWIPE_VISUAL_MAX_PX/);
  assert.match(hook, /if \(candidate === currentKey\)[\s\S]*clearSwipeVisual/);
  assert.doesNotMatch(hook, /TAB_SWIPE_EDGE_RESISTANCE/);
  assert.match(hook, /setSwipeVisual\(/);
  assert.match(hook, /candidate === currentKey/);
  assert.match(hook, /dataset\.tabSwipeCommit/);
  assert.match(css, /data-tab-swipe-state='dragging'/);
  assert.match(css, /var\(--tab-swipe-offset/);
  assert.match(css, /galactrix-tab-swipe-next/);
  assert.match(css, /galactrix-tab-swipe-previous/);
});

test('chat appearance offers four distinct persistent layouts', async () => {
  const [preferences, messages, types, rustSettings, icon] = await Promise.all([
    read('src/features/profile/components/ChatPreferences.tsx'),
    read('src/features/chats/components/MessageList.tsx'),
    read('src/types.ts'),
    read('src-tauri/src/app_settings.rs'),
    read('src/components/Icon.tsx'),
  ]);

  for (const mode of ['conversation', 'bubbles', 'messenger', 'reading']) {
    assert.match(preferences, new RegExp(`id="${mode}"`));
    assert.match(types, new RegExp(`'${mode}'`));
    assert.match(rustSettings, new RegExp(`"${mode}"`));
  }
  for (const iconName of [
    'layout-conversation',
    'layout-bubbles',
    'layout-left',
    'layout-reading',
  ]) {
    assert.match(icon, new RegExp(`'${iconName}'`));
    assert.match(preferences, new RegExp(`name="${iconName}"`));
  }
  assert.match(messages, /const bubblesMode = viewMode === 'bubbles'/);
  assert.match(messages, /const readingMode = viewMode === 'reading'/);
});

test('scale scroll restoration preserves progress and bottom lock', () => {
  assert.equal(
    restoredScrollTop(
      { scrollTop: 400, scrollHeight: 1200, clientHeight: 400 },
      { scrollHeight: 1600, clientHeight: 400 },
    ),
    600,
  );
  assert.equal(
    restoredScrollTop(
      { scrollTop: 792, scrollHeight: 1200, clientHeight: 400 },
      { scrollHeight: 1800, clientHeight: 400 },
    ),
    1400,
  );
  assert.equal(
    restoredScrollTop(
      { scrollTop: 0, scrollHeight: 1200, clientHeight: 400 },
      { scrollHeight: 1800, clientHeight: 400 },
    ),
    0,
  );
});

test('interface scale keeps scroll containers stable and reset action on one row', async () => {
  const [preferences, scale] = await Promise.all([
    read('src/app/useApplicationPreferences.ts'),
    read('src/features/profile/components/ScaleSettings.tsx'),
  ]);

  assert.match(preferences, /\.page-scroll, \.chat-message-scroller/);
  assert.match(preferences, /requestAnimationFrame/);
  assert.match(preferences, /restoredScrollTop/);
  assert.match(scale, /flex items-start justify-between gap-3/);
  assert.match(scale, /shrink-0 whitespace-nowrap/);
});
