import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialMessageWindowStart,
  previousMessageWindowStart,
} from '../../src/features/chats/messageWindow.ts';

test('small chats render completely', () => {
  assert.equal(initialMessageWindowStart(20, 48), 0);
});

test('large chats initially render only the newest message window', () => {
  assert.equal(initialMessageWindowStart(1_000, 48), 952);
});

test('older messages are revealed in bounded batches', () => {
  assert.equal(previousMessageWindowStart(952, 40), 912);
  assert.equal(previousMessageWindowStart(12, 40), 0);
});
