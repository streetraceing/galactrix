import type { Message } from '../../types';

export const MESSAGE_VIRTUAL_OVERSCAN_PX = 420;
export const MESSAGE_VIRTUAL_MIN_ITEMS = 6;
export const MESSAGE_VIRTUALIZATION_THRESHOLD = 64;

const DESKTOP_ASSISTANT_CHARS_PER_LINE = 76;
const DESKTOP_USER_CHARS_PER_LINE = 58;
const MOBILE_CHARS_PER_LINE = 38;
const MESSAGE_VERTICAL_GAP = 16;

export function estimateMessageHeight(message: Message, mobile: boolean) {
  const content = message.content;
  const scanLimit = Math.min(content.length, 2_048);
  let explicitLines = 1;
  for (let index = 0; index < scanLimit; index += 1) {
    if (content.charCodeAt(index) === 10) explicitLines += 1;
  }
  if (scanLimit < content.length) {
    explicitLines += Math.ceil((content.length - scanLimit) / 120);
  }
  const charsPerLine = mobile
    ? MOBILE_CHARS_PER_LINE
    : message.role === 'user'
      ? DESKTOP_USER_CHARS_PER_LINE
      : DESKTOP_ASSISTANT_CHARS_PER_LINE;
  const wrappedLines = Math.max(1, Math.ceil(content.length / charsPerLine));
  const visualLines = Math.max(explicitLines, wrappedLines);
  const primaryLines = Math.min(visualLines, 24);
  const overflowLines = Math.max(0, visualLines - primaryLines);
  const preview = content.slice(0, scanLimit);
  const codeBlockAllowance =
    preview.includes('```') || /(?:^|\n) {4}\S/.test(preview) ? 44 : 0;
  const baseHeight = mobile ? 74 : 82;
  const estimated =
    baseHeight +
    primaryLines * (mobile ? 20 : 21) +
    Math.sqrt(overflowLines) * 34 +
    codeBlockAllowance +
    MESSAGE_VERTICAL_GAP;

  return Math.round(Math.min(960, Math.max(104, estimated)));
}

export function buildMessageOffsets(messageHeights: readonly number[]) {
  const offsets = new Array<number>(messageHeights.length + 1);
  offsets[0] = 0;
  for (let index = 0; index < messageHeights.length; index += 1) {
    offsets[index + 1] = offsets[index] + Math.max(1, messageHeights[index]);
  }
  return offsets;
}

function firstIndexAfterOffset(offsets: readonly number[], offset: number) {
  let low = 0;
  let high = Math.max(0, offsets.length - 1);

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle] <= offset) low = middle + 1;
    else high = middle;
  }

  return Math.max(0, low - 1);
}

export function messageVirtualRange(
  offsets: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = MESSAGE_VIRTUAL_OVERSCAN_PX,
  minimumItems = MESSAGE_VIRTUAL_MIN_ITEMS,
) {
  const messageCount = Math.max(0, offsets.length - 1);
  if (messageCount === 0) return { start: 0, end: 0 };

  const totalHeight = offsets[messageCount];
  const safeViewportHeight = Math.max(1, viewportHeight || 1);
  const resolvedScrollTop = Number.isFinite(scrollTop)
    ? Math.max(0, Math.min(scrollTop, totalHeight))
    : Math.max(0, totalHeight - safeViewportHeight);
  const startOffset = Math.max(0, resolvedScrollTop - Math.max(0, overscan));
  const endOffset = Math.min(
    totalHeight,
    resolvedScrollTop + safeViewportHeight + Math.max(0, overscan),
  );

  let start = Math.min(
    messageCount - 1,
    firstIndexAfterOffset(offsets, startOffset),
  );
  let end = Math.min(
    messageCount,
    Math.max(start + 1, firstIndexAfterOffset(offsets, endOffset) + 1),
  );

  const requestedMinimum = Math.min(
    messageCount,
    Math.max(1, Math.floor(minimumItems)),
  );
  if (end - start < requestedMinimum) {
    const missing = requestedMinimum - (end - start);
    const before = Math.min(start, Math.ceil(missing / 2));
    start -= before;
    end = Math.min(messageCount, end + (missing - before));
    if (end - start < requestedMinimum) {
      start = Math.max(0, end - requestedMinimum);
    }
  }

  return { start, end };
}
