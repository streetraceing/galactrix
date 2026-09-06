import assert from 'node:assert/strict';
import test from 'node:test';
import type { Message } from '../../src/types';
import {
  MESSAGE_VIRTUAL_CHUNK_ITEMS,
  MESSAGE_VIRTUAL_INITIAL_MIN_ITEMS,
  MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX,
  MESSAGE_VIRTUAL_MAX_RENDERED_ITEMS,
  MESSAGE_VIRTUAL_MIN_ITEMS,
  MESSAGE_VIRTUAL_OVERSCAN_PX,
  MESSAGE_VIRTUAL_STRESS_MESSAGE_COUNT,
  MESSAGE_VIRTUALIZATION_THRESHOLD,
  buildMessageOffsets,
  estimateMessageHeight,
  messageMaxScrollTop,
  messageVirtualRange,
  reconcileMessageScrollTop,
  resolveMessageMeasurement,
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

test('virtual chat defaults trade a wider buffer for fewer scroll renders', () => {
  assert.equal(MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX, 240);
  assert.equal(MESSAGE_VIRTUAL_OVERSCAN_PX, 1_800);
  assert.equal(MESSAGE_VIRTUAL_INITIAL_MIN_ITEMS, 8);
  assert.equal(MESSAGE_VIRTUAL_MIN_ITEMS, 16);
  assert.equal(MESSAGE_VIRTUAL_CHUNK_ITEMS, 8);
  assert.equal(MESSAGE_VIRTUAL_MAX_RENDERED_ITEMS, 64);
  assert.equal(MESSAGE_VIRTUAL_STRESS_MESSAGE_COUNT, 10_000);
  assert.equal(MESSAGE_VIRTUALIZATION_THRESHOLD, 120);
});

test('message height estimates account for content and viewport density', () => {
  const brief = estimateMessageHeight(message('Hello'), false);
  const long = estimateMessageHeight(message('Long text '.repeat(80)), false);
  const mobile = estimateMessageHeight(message('Long text '.repeat(20)), true);
  const desktop = estimateMessageHeight(
    message('Long text '.repeat(20)),
    false,
  );
  const wideDesktop = estimateMessageHeight(
    message('Long text '.repeat(20)),
    false,
    true,
  );

  assert.ok(long > brief);
  assert.ok(mobile > desktop);
  assert.ok(wideDesktop < desktop);
  assert.ok(brief >= 104);
});

test('message offsets preserve the complete virtual scroll height', () => {
  assert.deepEqual(buildMessageOffsets([100, 120, 80]), [0, 100, 220, 300]);
});

test('measured message heights only replace geometry when they really differ', () => {
  assert.equal(resolveMessageMeasurement(221.4, undefined, 220), 222);
  assert.equal(resolveMessageMeasurement(220.4, 220, undefined), null);
  assert.equal(resolveMessageMeasurement(120.5, undefined, 120), null);
  assert.equal(resolveMessageMeasurement(140, 118, undefined), 140);
  assert.equal(resolveMessageMeasurement(0, undefined, undefined), 1);
  assert.equal(resolveMessageMeasurement(Number.NaN, undefined, undefined), 1);
});

test('virtual ranges stay bounded and align to stable chunks', () => {
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
  assert.equal(middle.start % MESSAGE_VIRTUAL_CHUNK_ITEMS, 0);
  assert.ok(middle.start > 0 && middle.end < 100);
  assert.equal(bottom.end, 100);
  assert.ok(bottom.start > 0);
});

test('large chats stay within the virtual DOM budget around each scroll anchor', () => {
  const messageHeight = 104;
  const offsets = buildMessageOffsets(
    Array.from(
      { length: MESSAGE_VIRTUAL_STRESS_MESSAGE_COUNT },
      () => messageHeight,
    ),
  );
  const checkpoints = [
    { scrollTop: 0, anchorIndex: 0 },
    { scrollTop: 520_000, anchorIndex: Math.floor(520_000 / messageHeight) },
    {
      scrollTop: Number.POSITIVE_INFINITY,
      anchorIndex: MESSAGE_VIRTUAL_STRESS_MESSAGE_COUNT - 1,
    },
  ];

  for (const checkpoint of checkpoints) {
    const range = messageVirtualRange(offsets, checkpoint.scrollTop, 900);
    assert.ok(
      range.end - range.start <= MESSAGE_VIRTUAL_MAX_RENDERED_ITEMS,
      `range of ${range.end - range.start} exceeded the DOM budget`,
    );
    assert.ok(range.start <= checkpoint.anchorIndex);
    assert.ok(range.end > checkpoint.anchorIndex);
  }
});

test('scroll-anchor reconciliation covers history, content growth, keyboard, and generation', () => {
  assert.equal(messageMaxScrollTop(4_000, 600), 3_400);

  const readingPosition = 1_200;
  const heightChanges = [
    { name: 'prepended history', currentOffset: 2_120, expected: 3_200 },
    { name: 'edited Markdown', currentOffset: 232, expected: 1_312 },
    { name: 'image hydration', currentOffset: 736, expected: 1_816 },
  ];
  for (const change of heightChanges) {
    assert.equal(
      reconcileMessageScrollTop({
        scrollTop: readingPosition,
        scrollHeight: 6_000,
        viewportHeight: 700,
        previousAnchorOffset: 120,
        currentAnchorOffset: change.currentOffset,
      }),
      change.expected,
      change.name,
    );
  }

  assert.equal(
    reconcileMessageScrollTop({
      scrollTop: 3_400,
      scrollHeight: 6_000,
      viewportHeight: 360,
      previousAnchorOffset: 0,
      currentAnchorOffset: 0,
      pinBottom: true,
    }),
    5_640,
  );
  assert.equal(
    reconcileMessageScrollTop({
      scrollTop: 5_640,
      scrollHeight: 6_480,
      viewportHeight: 360,
      previousAnchorOffset: 0,
      currentAnchorOffset: 0,
      pinBottom: true,
    }),
    6_120,
  );
});
