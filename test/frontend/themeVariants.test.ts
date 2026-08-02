import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedVariants = [
  'mint',
  'uber',
  'rabbit',
  'catppuccin',
  'tokyo-night',
  'nord',
  'dracula',
  'rose-pine',
  'gruvbox',
  'solarized',
  'monochrome',
] as const;

test('all extended color themes can be selected and persisted', async () => {
  const [settings, types, css, backend] = await Promise.all([
    readFile(
      new URL(
        '../../src/features/profile/components/ThemeSettings.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../../src/types.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src-tauri/src/lib.rs', import.meta.url), 'utf8'),
  ]);

  for (const variant of expectedVariants) {
    assert.match(settings, new RegExp(`id: '${variant}'`));
    assert.match(types, new RegExp(String.raw`\| '${variant}'`));
    assert.match(css, new RegExp(`data-theme-variant='${variant}'`, 'g'));
    assert.match(backend, new RegExp(String.raw`\| "${variant}"`));
  }
});
