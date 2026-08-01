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
  assert.equal(shouldStartMessageRangeSelection('one', 'one', 1, 8, 6), true);
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
  assert.match(source, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(
    source,
    /armed: isSecondaryMouse \|\| selectedMessageIds\.size > 0/,
  );
  assert.match(source, /activatedByHold/);
  assert.match(source, /isTouch && selectedMessageIds\.size === 0/);
  assert.match(source, /onContextMenuCapture=/);
  assert.match(source, /selectionGestureRef\.current\?\.active/);
  assert.match(source, /event\.key !== 'Escape'/);
  assert.match(source, /document\.addEventListener\('pointerdown'/);
  assert.match(source, /data-message-selection-toolbar/);
  assert.match(source, /target\.closest\('\[data-message-id\]'\)/);
  assert.match(
    source,
    /messageElement && !isMessageSelectionControl\(target\)/,
  );
  assert.match(source, /clearMessageSelection\(\)/);
  assert.match(source, /messageList\.selectMessage/);
  assert.match(source, /onSelectMessage=\{selectMessage\}/);
  assert.doesNotMatch(source, /ring-2 ring-accent/);
  assert.match(
    source,
    /isSelected \? \(isUser \? 'bg-accent\/15' : 'bg-default\/85'\)/,
  );
  assert.doesNotMatch(source, /isSelected \? 'bg-default\/70'/);
  assert.match(source, /selectedMessageIds\.size > 0 \? 'select-none'/);
  assert.match(source, /onDeleteMany\(selectedMessages\.map/);
  assert.match(source, /setDeletingSelection\(true\)/);
  assert.match(source, /<ContextMenu>/);
  assert.match(source, /data-message-id=\{message\.id\}/);
  assert.match(source, /messageList\.selectedMessages/);
});
