import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  MOTION_DURATION_MS,
  MOTION_EASING,
  TYPING_DOT_CYCLE_MS,
} from '../../src/lib/motion.ts';

const appCssPath = new URL('../../src/App.css', import.meta.url);
const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);

test('CSS and imperative animations share one motion scale', async () => {
  const css = await readFile(appCssPath, 'utf8');

  for (const [name, duration] of Object.entries(MOTION_DURATION_MS)) {
    assert.match(css, new RegExp(`--motion-${name}: ${duration}ms`));
  }
  assert.match(
    css,
    new RegExp(`--motion-typing-cycle: ${TYPING_DOT_CYCLE_MS}ms`),
  );
  assert.match(
    css,
    new RegExp(`--motion-ease: ${escapeRegex(MOTION_EASING.standard)}`),
  );
  assert.match(
    css,
    new RegExp(`--motion-ease-enter: ${escapeRegex(MOTION_EASING.enter)}`),
  );
  assert.match(
    css,
    new RegExp(`--motion-ease-exit: ${escapeRegex(MOTION_EASING.exit)}`),
  );
});

test('overlays, screens and transient status use the shared motion vocabulary', async () => {
  const css = await readFile(appCssPath, 'utf8');

  assert.match(css, /\.app-screen-enter \{[\s\S]*var\(--motion-standard\)/);
  assert.match(css, /\.toast\[data-entering\][\s\S]*galactrix-toast-enter/);
  assert.match(css, /\.modal__backdrop\[data-entering\]/);
  assert.match(css, /\.tooltip\[data-entering\]/);
  assert.match(css, /\.select__popover,[\s\S]*\.dropdown__popover/);
  assert.match(css, /\.motion-status-enter/);
});

test('message mutations animate without violating reduced-motion preferences', async () => {
  const [css, source] = await Promise.all([
    readFile(appCssPath, 'utf8'),
    readFile(messageListPath, 'utf8'),
  ]);

  assert.match(source, /animationsEnabled\(\)/);
  assert.match(source, /await waitForMotion\(MOTION_DURATION_MS\.standard\)/);
  assert.match(source, /restoreExitedMessages/);
  assert.match(
    css,
    /\.message-surface \{[\s\S]*interpolate-size: allow-keywords/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.message-presence,[\s\S]*\.message-surface \{\s*transition: none/,
  );
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
