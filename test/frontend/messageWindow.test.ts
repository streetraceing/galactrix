import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialMessageWindowStart,
  previousMessageWindowStart,
} from '../../src/features/chats/messageWindow.ts';

test('small chats render completely', () => {
  assert.equal(initialMessageWindowStart(16, 16), 0);
});

test('large chats initially render only the newest message window', () => {
  assert.equal(initialMessageWindowStart(1_000, 16), 984);
});

test('older messages are revealed in bounded batches', () => {
  assert.equal(previousMessageWindowStart(980, 20), 960);
  assert.equal(previousMessageWindowStart(12, 20), 0);
});
