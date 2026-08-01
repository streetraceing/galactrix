import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMessageTime } from '../../src/features/chats/messageTime.ts';

test('message times are formatted from unix seconds in the runtime timezone', () => {
  const timestampSeconds = 1_700_000_000;
  const expected = new Date(timestampSeconds * 1_000).toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' },
  );

  assert.equal(formatMessageTime(timestampSeconds), expected);
});

test('invalid message timestamps do not render misleading clock values', () => {
  assert.equal(formatMessageTime(Number.NaN), '');
});
