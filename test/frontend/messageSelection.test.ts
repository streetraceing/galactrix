import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  addMessageSelection,
  mergeMessageSelection,
  messageSelectionRange,
  shouldStartMessageRangeSelection,
  toggleMessageSelection,
} from '../../src/features/chats/messageSelection';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);

test('message selection ranges stay ordered in both drag directions', () => {
  const ids = ['one', 'two', 'three', 'four'];

  assert.deepEqual(messageSelectionRange(ids, 'two', 'four'), [
    'two',
    'three',
    'four',
  ]);
  assert.deepEqual(messageSelectionRange(ids, 'four', 'two'), [
    'two',
    'three',
    'four',
  ]);
});

test('message selection merges ranges and supports explicit selection', () => {
  const merged = mergeMessageSelection(new Set(['existing']), [
    'second',
    'third',
  ]);

  assert.deepEqual([...merged], ['existing', 'second', 'third']);
  assert.deepEqual(
    [...toggleMessageSelection(merged, 'second')],
    ['existing', 'third'],
  );
  assert.deepEqual(
    [...addMessageSelection(merged, 'fourth')],
    ['existing', 'second', 'third', 'fourth'],
  );
});

test('range selection starts only after an intentional drag', () => {
  assert.equal(shouldStartMessageRangeSelection('one', 'one', 1, 1, 6), false);
  assert.equal(shouldStartMessageRangeSelection('one', 'one', 1, -8, 6), true);
  assert.equal(shouldStartMessageRangeSelection('one', 'one', 9, -7, 6), false);
  assert.equal(shouldStartMessageRangeSelection('one', 'two', 0, 2, 6), true);
});

test('message gestures preserve context menus while supporting click and drag selection', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /TOUCH_MULTISELECT_HOLD_MS = 320/);
  assert.match(source, /event\.pointerType === 'mouse' && event\.button === 2/);
  assert.match(source, /toggleMessageSelection\(current, gesture\.startId\)/);
  assert.match(source, /shouldStartMessageRangeSelection\(/);
  assert.match(source, /messageSelectionRange\(visibleMessageIds/);
  assert.match(source, /setPointerCapture\(event\.pointerId\)/);
  assert.match(source, /onContextMenuCapture=/);
  assert.match(source, /selectionGestureRef\.current\?\.active/);
  assert.match(source, /messageList\.selectMessage/);
  assert.match(source, /onSelectMessage=\{selectMessage\}/);
  assert.match(source, /-inset-x-3 -inset-y-2/);
  assert.match(source, /<ContextMenu>/);
  assert.match(source, /data-message-id=\{message\.id\}/);
  assert.match(source, /messageList\.selectedMessages/);
});
