import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const messageListPath = new URL(
  '../../src/features/chats/components/MessageList.tsx',
  import.meta.url,
);
const conversationHeaderPath = new URL(
  '../../src/features/chats/components/ConversationHeader.tsx',
  import.meta.url,
);

test('mobile continuation is available only from the context menu', async () => {
  const source = await readFile(messageListPath, 'utf8');
  const compactNavigator = source.match(
    /if \(compact\) \{[\s\S]*?\n  \}\n\n  return \(/,
  )?.[0];

  assert.ok(compactNavigator, 'compact mobile navigator must exist');
  assert.doesNotMatch(compactNavigator, /continueResponseShort|onContinue/);
  assert.match(
    source,
    /ContextMenuItem onClick=\{\(\) => run\(\(\) => onContinue\(message\.id\)\)\}/,
  );
});

test('mobile swipe owns one height-locked release animation', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /axis: 'pending' \| 'horizontal' \| 'vertical'/);
  assert.match(source, /container\.style\.height = `\$\{oldHeight\}px`/);
  assert.match(source, /container\.style\.overflow = 'clip'/);
  assert.match(
    source,
    /await finishAnimation\(exitAnimation\);[\s\S]*?const resultPromise = action\(\)/,
  );
  assert.match(source, /duration: 210/);
  assert.match(source, /className="relative z-10"/);
  assert.doesNotMatch(source, /transition-\[transform,opacity\]/);
  assert.match(source, /enabled=\{!isMobile\}/);
  assert.match(source, /className="relative touch-pan-y overflow-x-clip"/);
});

test('mobile message overlays open after the context menu closes', async () => {
  const source = await readFile(messageListPath, 'utf8');

  assert.match(source, /const deferOverlayAction/);
  assert.match(
    source,
    /onClick=\{\(\) => deferOverlayAction\(onEditRequest\)\}/,
  );
  assert.match(source, /max-h-\[min\(60dvh,24rem\)\][^"']*overflow-y-auto/);
});

test('chat title uses a full mobile modal and keeps desktop popover', async () => {
  const source = await readFile(conversationHeaderPath, 'utf8');

  assert.match(source, /const isMobile = isMobilePlatform\(\)/);
  assert.match(source, /isMobile \? \([\s\S]*setOverviewOpen\(true\)/);
  assert.match(source, /<UiModal[\s\S]*title=\{chat\.title\}/);
  assert.match(source, /<Popover isOpen=\{overviewOpen\}/);
});
