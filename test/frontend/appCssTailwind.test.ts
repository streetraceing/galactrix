import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appCssPath = new URL('../../src/App.css', import.meta.url);

test('ordinary application layout styles use Tailwind apply utilities', async () => {
  const css = await readFile(appCssPath, 'utf8');

  assert.match(css, /html,[\s\S]*#root \{[\s\S]*@apply m-0 h-full w-full/);
  assert.match(css, /\*,[\s\S]*\*::after \{[\s\S]*@apply box-border/);
  assert.match(
    css,
    /\.chat-message-scroller \{[\s\S]*@apply[^;]*overflow-y-scroll/,
  );
  assert.match(
    css,
    /\.chat-message-canvas \{[\s\S]*@apply relative z-0 min-h-min bg-background/,
  );
  assert.match(css, /\.page-header \{[\s\S]*@apply static! inset-auto!/);
  assert.match(
    css,
    /\.page-title \{[\s\S]*@apply text-center text-xl leading-7/,
  );
  assert.match(css, /\.typing-dot \{[\s\S]*@apply animate-none opacity-70/);

  // Keep browser-specific and dynamic pieces in native CSS where utilities are unsuitable.
  assert.match(css, /-webkit-app-region: drag/);
  assert.match(css, /overflow-anchor: none/);
  assert.match(css, /@keyframes galactrix-message-enter/);
});

test('context menus use a lightweight custom transition without scale or blur', async () => {
  const [css, component] = await Promise.all([
    readFile(appCssPath, 'utf8'),
    readFile(
      new URL('../../src/components/ui/context-menu.tsx', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(css, /\.app-context-menu \{[\s\S]*backdrop-filter: none/);
  assert.match(css, /\.app-context-menu\[data-starting-style\]/);
  assert.match(css, /transform: translate3d/);
  assert.doesNotMatch(component, /data-starting-style:scale/);
  assert.match(component, /app-context-menu app-context-submenu/);
});
