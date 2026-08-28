import type { Message } from '../../types';

export const MESSAGE_VIRTUAL_INITIAL_OVERSCAN_PX = 240;
export const MESSAGE_VIRTUAL_OVERSCAN_PX = 1_800;
export const MESSAGE_VIRTUAL_INITIAL_MIN_ITEMS = 8;
export const MESSAGE_VIRTUAL_MIN_ITEMS = 16;
export const MESSAGE_VIRTUAL_CHUNK_ITEMS = 8;
// Keep a long history's mounted DOM bounded. A viewport that genuinely shows
// more rows may exceed this value so that no visible content is omitted.
export const MESSAGE_VIRTUAL_MAX_RENDERED_ITEMS = 64;
export const MESSAGE_VIRTUAL_STRESS_MESSAGE_COUNT = 10_000;
// The native browser scroll path is smoother for normal conversations. The
// measured virtual window is reserved for genuinely long histories.
export const MESSAGE_VIRTUALIZATION_THRESHOLD = 120;

const DESKTOP_ASSISTANT_CHARS_PER_LINE = 76;
const DESKTOP_USER_CHARS_PER_LINE = 58;
const WIDE_DESKTOP_ASSISTANT_CHARS_PER_LINE = 104;
const WIDE_DESKTOP_USER_CHARS_PER_LINE = 78;
const MOBILE_CHARS_PER_LINE = 38;
const MESSAGE_VERTICAL_GAP = 16;

export function estimateMessageHeight(
  message: Message,
  mobile: boolean,
  wide = false,
) {
  const content = message.content;
  const scanLimit = Math.min(content.length, 256);
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
      ? wide
        ? WIDE_DESKTOP_USER_CHARS_PER_LINE
        : DESKTOP_USER_CHARS_PER_LINE
      : wide
        ? WIDE_DESKTOP_ASSISTANT_CHARS_PER_LINE
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

export function messageMaxScrollTop(
  scrollHeight: number,
  viewportHeight: number,
) {
  const safeScrollHeight = Number.isFinite(scrollHeight)
    ? Math.max(0, scrollHeight)
    : 0;
  const safeViewportHeight = Number.isFinite(viewportHeight)
    ? Math.max(0, viewportHeight)
    : 0;
  return Math.max(0, safeScrollHeight - safeViewportHeight);
}

export type MessageScrollAnchor = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  previousAnchorOffset: number;
  currentAnchorOffset: number;
  pinBottom?: boolean;
};

/**
 * Reconcile a post-layout scroll position without moving the message the
 * reader was looking at. The same calculation covers prepended history,
 * edited Markdown, image hydration, keyboard resizes, and streaming tails.
 */
export function reconcileMessageScrollTop({
  scrollTop,
  scrollHeight,
  viewportHeight,
  previousAnchorOffset,
  currentAnchorOffset,
  pinBottom = false,
}: MessageScrollAnchor) {
  const maximumScrollTop = messageMaxScrollTop(scrollHeight, viewportHeight);
  if (pinBottom) return maximumScrollTop;

  const resolvedScrollTop = Number.isFinite(scrollTop)
    ? scrollTop
    : maximumScrollTop;
  const previousOffset = Number.isFinite(previousAnchorOffset)
    ? previousAnchorOffset
    : 0;
  const currentOffset = Number.isFinite(currentAnchorOffset)
    ? currentAnchorOffset
    : previousOffset;
  return Math.min(
    maximumScrollTop,
    Math.max(0, resolvedScrollTop + currentOffset - previousOffset),
  );
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
  maximumItems = MESSAGE_VIRTUAL_MAX_RENDERED_ITEMS,
) {
  const messageCount = Math.max(0, offsets.length - 1);
  if (messageCount === 0) return { start: 0, end: 0 };

  const totalHeight = offsets[messageCount];
  const safeViewportHeight = Math.max(1, viewportHeight || 1);
  const resolvedScrollTop = Number.isFinite(scrollTop)
    ? Math.max(0, Math.min(scrollTop, totalHeight))
    : Math.max(0, totalHeight - safeViewportHeight);
  const viewportEndOffset = Math.min(
    totalHeight,
    resolvedScrollTop + safeViewportHeight,
  );
  const viewportStart = Math.min(
    messageCount - 1,
    firstIndexAfterOffset(offsets, resolvedScrollTop),
  );
  const viewportEnd = Math.min(
    messageCount,
    Math.max(
      viewportStart + 1,
      firstIndexAfterOffset(offsets, viewportEndOffset) + 1,
    ),
  );
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

  const chunk = Math.max(1, MESSAGE_VIRTUAL_CHUNK_ITEMS);
  start = Math.max(0, Math.floor(start / chunk) * chunk);
  end = Math.min(messageCount, Math.ceil(end / chunk) * chunk);

  const requestedMaximum = Number.isFinite(maximumItems)
    ? Math.max(requestedMinimum, Math.floor(maximumItems))
    : messageCount;
  const viewportItems = Math.max(1, viewportEnd - viewportStart);
  const maximumWindowItems = Math.min(
    messageCount,
    Math.max(
      Math.ceil(requestedMaximum / chunk) * chunk,
      Math.ceil(viewportItems / chunk) * chunk,
    ),
  );
  if (end - start > maximumWindowItems) {
    const extraItems = maximumWindowItems - viewportItems;
    const preferredStart =
      viewportStart - Math.floor(Math.max(0, extraItems) / 2);
    start = Math.max(
      0,
      Math.min(
        messageCount - maximumWindowItems,
        Math.floor(preferredStart / chunk) * chunk,
      ),
    );
    end = Math.min(messageCount, start + maximumWindowItems);
    if (end < viewportEnd) {
      end = Math.min(messageCount, Math.ceil(viewportEnd / chunk) * chunk);
      start = Math.max(0, end - maximumWindowItems);
    }
  }

  return { start, end };
}
