import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isHorizontalSwipeIntent,
  mobileSwipeDragOffset,
  shouldCommitMobileSwipe,
} from '../../src/features/chats/mobileSwipe.ts';

test('mobile swipe accepts a short deliberate drag and a quick flick', () => {
  assert.equal(shouldCommitMobileSwipe(31, 8, 240), true);
  assert.equal(shouldCommitMobileSwipe(18, 4, 40), true);
  assert.equal(shouldCommitMobileSwipe(14, 2, 40), false);
});

test('vertical scrolling is not classified as a horizontal variant swipe', () => {
  assert.equal(isHorizontalSwipeIntent(8, 20), false);
  assert.equal(shouldCommitMobileSwipe(40, 70, 100), false);
});

test('available variants follow the finger more closely than an unavailable edge', () => {
  assert.equal(mobileSwipeDragOffset(100, true), 82);
  assert.equal(mobileSwipeDragOffset(100, false), 18);
  assert.equal(mobileSwipeDragOffset(500, true), 112);
});
