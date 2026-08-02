import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shouldDismissToastSwipe,
  toastSwipeDismissDistance,
  toastSwipeOpacity,
} from '../../src/components/ui/toastSwipe.ts';

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
