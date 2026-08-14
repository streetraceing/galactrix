import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { cn } from '../../src/lib/cn.ts';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('shared UI primitives keep semantic surfaces and predictable states', async () => {
  const [panel, collection, tabs, css] = await Promise.all([
    read('src/components/ui/AppPanel.tsx'),
    read('src/components/ui/CollectionCard.tsx'),
    read('src/components/ui/AppTabList.tsx'),
    read('src/App.css'),
  ]);

  assert.match(panel, /emphasis === 'subtle' \? 'secondary' : 'default'/);
  assert.match(panel, /interactive && 'app-panel--interactive'/);
  assert.match(panel, /selected && 'app-panel--selected'/);
  assert.match(collection, /<SelectionIndicator selected=\{selected\}/);
  assert.match(collection, /aria-pressed=\{selectionActive \? selected/);
  assert.match(collection, /collection-card__metadata/);
  assert.match(tabs, /<Tabs\.ListContainer/);
  assert.match(tabs, /<Tabs\.Indicator/);
  assert.match(css, /\.app-tabs__list > \.tabs__tab/);
  assert.match(css, /min-h-11/);
});

test('class composition removes conflicting utility classes', () => {
  assert.equal(cn('px-2', false && 'hidden', 'px-4'), 'px-4');
});

test('the application has a recoverable render boundary', async () => {
  const [main, boundary] = await Promise.all([
    read('src/main.tsx'),
    read('src/components/layout/AppErrorBoundary.tsx'),
  ]);

  assert.match(main, /<AppErrorBoundary>/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /window\.location\.reload\(\)/);
});

test('chat list and conversation context use indexed Galaxy lookup', async () => {
  const [sidebar, conversation] = await Promise.all([
    read('src/features/chats/components/ChatSidebar.tsx'),
    read('src/features/chats/components/ConversationHeader.tsx'),
  ]);

  assert.match(sidebar, /const characterById = useMemo/);
  assert.match(sidebar, /characterById\.get\(chat\.characterId\)/);
  assert.match(conversation, /const galaxyById = useMemo/);
  assert.match(conversation, /galaxyById\.get\(id\)/);
});
