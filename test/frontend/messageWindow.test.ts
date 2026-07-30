import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialMessageWindowStart,
  messageWindowScrollState,
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

test('initial programmatic layout at the top cannot reveal chat history', () => {
  assert.deepEqual(messageWindowScrollState(0, false), {
    armed: false,
    shouldLoad: false,
  });
});

test('history loads once only after the scroller was away from the top', () => {
  const armed = messageWindowScrollState(400, false);
  assert.deepEqual(armed, { armed: true, shouldLoad: false });

  const load = messageWindowScrollState(20, armed.armed);
  assert.deepEqual(load, { armed: false, shouldLoad: true });

  assert.deepEqual(messageWindowScrollState(20, load.armed), {
    armed: false,
    shouldLoad: false,
  });
});
