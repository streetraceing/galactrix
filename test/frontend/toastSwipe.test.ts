import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  shouldDismissToastSwipe,
  toastSwipeDismissDistance,
  toastSwipeOpacity,
} from '../../src/components/ui/toastSwipe.ts';

const toastComponentPath = new URL(
  '../../src/components/ui/SwipeDismissToast.tsx',
  import.meta.url,
);
const providersPath = new URL('../../src/providers.tsx', import.meta.url);
const cssPath = new URL('../../src/App.css', import.meta.url);

test('toast swipe dismisses in either horizontal direction', () => {
  assert.equal(shouldDismissToastSwipe(80, 320), true);
  assert.equal(shouldDismissToastSwipe(-80, 320), true);
  assert.equal(shouldDismissToastSwipe(40, 320), false);
});

test('toast swipe threshold remains usable across phone widths', () => {
  assert.equal(toastSwipeDismissDistance(200), 56);
  assert.equal(toastSwipeDismissDistance(320), 70.4);
  assert.equal(toastSwipeDismissDistance(800), 96);
});

test('toast stays partly visible while following the finger', () => {
  assert.equal(toastSwipeOpacity(0, 320), 1);
  assert.equal(toastSwipeOpacity(320, 320), 0.35);
  assert.equal(toastSwipeOpacity(20, 0), 1);
});

test('danger toasts keep long errors bounded, expandable, and copyable', async () => {
  const [component, providers, css] = await Promise.all([
    readFile(toastComponentPath, 'utf8'),
    readFile(providersPath, 'utf8'),
    readFile(cssPath, 'utf8'),
  ]);

  assert.match(component, /content\.variant === 'danger'/);
  assert.match(component, /line-clamp-2/);
  assert.match(component, /app-toast-description-expanded/);
  assert.match(component, /writeClipboardText\(copyText\)/);
  assert.match(component, /toast\.showDetails/);
  assert.match(component, /toast\.hideDetails/);
  assert.match(providers, /100dvw/);
  assert.match(providers, /app-toast-region/);
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /\.app-toast-danger/);
  assert.match(css, /max-height: min\(70dvh, 28rem\)/);
});
