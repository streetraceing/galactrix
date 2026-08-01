import assert from 'node:assert/strict';
import test from 'node:test';
import type { Message } from '../../src/types';
import {
  MESSAGE_VIRTUAL_MIN_ITEMS,
  MESSAGE_VIRTUAL_OVERSCAN_PX,
  buildMessageOffsets,
  estimateMessageHeight,
  messageVirtualRange,
} from '../../src/features/chats/messageWindow.ts';

function message(
  content: string,
  role: Message['role'] = 'assistant',
): Message {
  return {
    id: `${role}-${content}`,
    chatId: 'chat',
    role,
    content,
    createdAt: 1,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
  };
}

test('virtual chat defaults keep the mounted message set small', () => {
  assert.equal(MESSAGE_VIRTUAL_OVERSCAN_PX, 420);
  assert.equal(MESSAGE_VIRTUAL_MIN_ITEMS, 6);
});

test('message height estimates account for content and viewport density', () => {
  const brief = estimateMessageHeight(message('Hello'), false);
  const long = estimateMessageHeight(message('Long text '.repeat(80)), false);
  const mobile = estimateMessageHeight(message('Long text '.repeat(20)), true);
  const desktop = estimateMessageHeight(
    message('Long text '.repeat(20)),
    false,
  );

  assert.ok(long > brief);
  assert.ok(mobile > desktop);
  assert.ok(brief >= 104);
});

test('message offsets preserve the complete virtual scroll height', () => {
  assert.deepEqual(buildMessageOffsets([100, 120, 80]), [0, 100, 220, 300]);
});

test('virtual ranges render bounded messages around any scrollbar position', () => {
  const offsets = buildMessageOffsets(Array.from({ length: 100 }, () => 100));

  const top = messageVirtualRange(offsets, 0, 500, 200, 6);
  const middle = messageVirtualRange(offsets, 5_000, 500, 200, 6);
  const bottom = messageVirtualRange(
    offsets,
    Number.POSITIVE_INFINITY,
    500,
    200,
    6,
  );

  assert.equal(top.start, 0);
  assert.ok(top.end < 100);
  assert.ok(middle.start > 0 && middle.end < 100);
  assert.equal(bottom.end, 100);
  assert.ok(bottom.start > 0);
});
