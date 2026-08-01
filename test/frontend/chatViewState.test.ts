import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStoredScrollTop } from '../../src/features/chats/chatViewState.ts';

test('chat scroll restoration prefers a stable message anchor', () => {
  assert.equal(
    resolveStoredScrollTop(
      ['a', 'b', 'c'],
      [0, 100, 260, 420],
      {
        scrollTop: 999,
        anchorMessageId: 'b',
        anchorOffset: -20,
        atBottom: false,
        updatedAt: 1,
      },
      120,
    ),
    120,
  );
});

test('chat scroll restoration keeps bottom-pinned conversations at the end', () => {
  assert.equal(
    resolveStoredScrollTop(
      ['a', 'b', 'c'],
      [0, 100, 260, 420],
      {
        scrollTop: 40,
        anchorMessageId: 'a',
        anchorOffset: 0,
        atBottom: true,
        updatedAt: 1,
      },
      120,
    ),
    300,
  );
});
