import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTION_STAGGER_MAX_STEPS, staggerDelayMs } from '../../src/lib/motion';

const rootPath = fileURLToPath(new URL('../../', import.meta.url));
const read = (relative: string) =>
  readFileSync(path.join(rootPath, relative), 'utf8');

function localeFiles(): string[] {
  const directory = path.join(rootPath, 'src/i18n/locales');
  const files: string[] = [];
  for (const locale of readdirSync(directory)) {
    const localeDirectory = path.join(directory, locale);
    for (const entry of readdirSync(localeDirectory)) {
      if (entry.endsWith('.json')) {
        files.push(path.join(localeDirectory, entry));
      }
    }
  }
  return files;
}

test('translated copy uses plain sentence punctuation instead of long dashes', () => {
  // U+2014 is the giveaway in machine-written prose. Numeric ranges keep the
  // shorter U+2013 dash, which is correct typography.
  const offenders: string[] = [];
  for (const file of localeFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const [index, line] of source.split('\n').entries()) {
      if (line.includes('\u2014')) {
        offenders.push(`${path.relative(rootPath, file)}:${index + 1}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('interface strings avoid the long dash outside the translation catalogs', () => {
  const offenders: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const source = readFileSync(full, 'utf8');
      for (const [index, line] of source.split('\n').entries()) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('///')) continue;
        if (line.includes('\u2014')) {
          offenders.push(`${path.relative(rootPath, full)}:${index + 1}`);
        }
      }
    }
  };
  walk(path.join(rootPath, 'src'));
  assert.deepEqual(offenders, []);
});

test('list entrance stagger is capped so later rows are never held back', () => {
  assert.equal(staggerDelayMs(0), 0);
  assert.equal(
    staggerDelayMs(MOTION_STAGGER_MAX_STEPS),
    staggerDelayMs(MOTION_STAGGER_MAX_STEPS * 4),
  );
  assert.ok(staggerDelayMs(1_000) <= MOTION_STAGGER_MAX_STEPS * 40);

  for (const file of [
    'src/features/galaxies/GalaxiesScreen.tsx',
    'src/features/profile/components/IdentitySettings.tsx',
    'src/components/ui/MetricGrid.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /staggerDelayMs\(index\)/, file);
    assert.doesNotMatch(source, /animationDelay: `\$\{index \*/, file);
  }
});

test('accordion headers keep a visible focus indicator', () => {
  const css = read('src/App.css');
  assert.match(css, /\.accordion__trigger:focus-visible \{/);
  assert.match(
    css,
    /\.accordion__trigger:focus-visible \{[\s\S]{0,120}ring-2 ring-focus/,
  );
  // No caller may strip the ring again through an inline class list.
  const orderSection = read(
    'src/features/chats/components/prompt-builder/PromptOrderSection.tsx',
  );
  assert.doesNotMatch(orderSection, /ring-transparent!/);
});

test('disabled animations also drop inline stagger delays', () => {
  const css = read('src/App.css');
  assert.match(css, /\[data-animations='off'\] \.collection-item-enter/);
  assert.match(css, /animation-delay: 0ms !important/);
});

test('shared selection controls stay reachable on touch screens', () => {
  const toolbar = read('src/components/ui/ContextSelectionToolbar.tsx');
  assert.doesNotMatch(toolbar, /size-7 min-w-7|size-8 min-w-8/);
  assert.match(toolbar, /size-10 min-w-10/);
});

test('the find button is reachable in archived chats and search stays read-only', () => {
  const list = read('src/features/chats/components/MessageList.tsx');
  // The find toggle is no longer hidden behind the read-only flag.
  assert.doesNotMatch(
    list,
    /\{!readOnly \? \(\s*<Button[\s\S]{0,200}findInChat/,
  );
  assert.match(list, /aria-label=\{t\('messageList\.findInChat'\)\}/);
});

test('a find jump moves the virtual window before scrolling', () => {
  const list = read('src/features/chats/components/MessageList.tsx');
  assert.match(list, /const scrollToMessageIndex = useCallback/);
  assert.match(
    list,
    /pendingFindJumpRef\.current = \{ messageId, scrollTop \}/,
  );
  assert.match(list, /scroller\.scrollTop = pending\.scrollTop/);
  // A new query starts at the first match rather than the second.
  assert.match(list, /goToFindMatch\(0\)/);
});

test('backup reminder bookkeeping uses the same clock as the stored state', () => {
  const hook = read('src/hooks/useBackupReminder.ts');
  const module = read('src/lib/backupReminder.ts');
  assert.match(module, /export function backupReminderNow\(\)/);
  assert.doesNotMatch(hook, /Date\.now\(\)/);
  assert.match(
    hook,
    /shouldSuggestBackup\(\s*readBackupReminderState\(\),\s*messageCount,\s*backupReminderNow\(\),/,
  );
});

test('restoring a Galaxy revision refreshes the open editor draft', () => {
  const screen = read('src/features/galaxies/GalaxiesScreen.tsx');
  const controller = read('src/app/useAppController.ts');
  assert.match(screen, /const restored = await onRestoreRevision\(/);
  assert.match(screen, /setEditing\(restored\)/);
  assert.match(screen, /setDraft\(draftFromItem\(restored\)\)/);
  assert.match(controller, /return restored;/);
});
