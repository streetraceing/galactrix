import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  chatsInCollection,
  isChatUnread,
  listChatCollections,
  RECENT_COLLECTION_WINDOW_MS,
} from '../../src/features/chats/chatCollections';
import type { Chat } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

function chat(overrides: Partial<Chat> & { id: string }): Chat {
  return {
    title: overrides.id,
    preview: '',
    updatedAt: 0,
    messageCount: 0,
    pinned: false,
    archived: false,
    autoTitle: false,
    tags: [],
    lastReadAt: 0,
    worldbookIds: [],
    promptConfig: {
      recentMessageLimit: 0,
      responseLength: 'auto',
      setIds: [],
      presetIds: [],
      contextPriorities: {
        persona: 'normal',
        character: 'normal',
        universe: 'normal',
        worldbooks: 'normal',
        remembered: 'normal',
      },
      customBlocks: [],
    },
    generationSettings: {},
    ...overrides,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = 10_000 * DAY_MS;

test('unread detection compares the latest activity with the read marker', () => {
  assert.equal(isChatUnread(chat({ id: 'a' })), false);
  assert.equal(
    isChatUnread(
      chat({ id: 'a', messageCount: 2, updatedAt: 500, lastReadAt: 0 }),
    ),
    true,
  );
  assert.equal(
    isChatUnread(
      chat({ id: 'a', messageCount: 2, updatedAt: 500, lastReadAt: 500 }),
    ),
    false,
  );
  assert.equal(
    isChatUnread(
      chat({ id: 'a', messageCount: 0, updatedAt: 500, lastReadAt: 0 }),
    ),
    false,
  );
});

test('collections cover built-ins, tags, characters and providers', () => {
  const chats = [
    chat({
      id: 'chat-1',
      messageCount: 3,
      updatedAt: Math.floor((NOW_MS - DAY_MS) / 1_000),
      tags: ['work'],
      characterId: 'char-1',
      providerId: 'prov-1',
    }),
    chat({
      id: 'chat-2',
      updatedAt: Math.floor((NOW_MS - 30 * DAY_MS) / 1_000),
      tags: ['work', 'story'],
    }),
    chat({ id: 'chat-3' }),
  ];

  const collections = listChatCollections({
    chats,
    characters: [{ id: 'char-1', name: 'Nova' }],
    providers: [{ id: 'prov-1', name: 'Lab' }],
    generatingChatIds: new Set(['chat-2']),
    nowMs: NOW_MS,
  });

  const byId = new Map(
    collections.map((collection) => [collection.id, collection]),
  );
  assert.equal(byId.get('all')?.count, 3);
  assert.equal(byId.get('recent')?.count, 1);
  assert.equal(byId.get('generating')?.count, 1);
  assert.equal(byId.get('tag:work')?.count, 2);
  assert.equal(byId.get('tag:story')?.count, 1);
  assert.equal(byId.get('character:char-1')?.count, 1);
  assert.equal(byId.get('provider:prov-1')?.count, 1);
  assert.ok(!byId.has('character:missing'));
  // Collections are ordered: built-ins first, then tags, characters, providers.
  assert.deepEqual(
    collections.slice(0, 4).map((c) => c.kind),
    ['all', 'unread', 'recent', 'generating'],
  );
});

test('collection filtering slices the chat list by id, tag or reference', () => {
  const chats = [
    chat({ id: 'chat-1', tags: ['work'] }),
    chat({ id: 'chat-2', characterId: 'char-1' }),
    chat({ id: 'chat-3', providerId: 'prov-1' }),
    chat({
      id: 'chat-4',
      updatedAt: Math.floor((NOW_MS - RECENT_COLLECTION_WINDOW_MS) / 1_000),
    }),
  ];
  const generating = new Set(['chat-1']);

  const ids = (collectionId: string) =>
    chatsInCollection(chats, collectionId, generating, NOW_MS).map(
      (chat) => chat.id,
    );

  assert.deepEqual(ids('all'), ['chat-1', 'chat-2', 'chat-3', 'chat-4']);
  assert.deepEqual(ids('generating'), ['chat-1']);
  assert.deepEqual(ids('tag:work'), ['chat-1']);
  assert.deepEqual(ids('character:char-1'), ['chat-2']);
  assert.deepEqual(ids('provider:prov-1'), ['chat-3']);
  // chat-4 sits exactly on the 7-day boundary, which counts as recent; the
  // other chats here use the fixture default of updatedAt 0.
  assert.deepEqual(ids('recent'), ['chat-4']);
  assert.deepEqual(ids('tag:unknown'), []);
  // Unknown collection ids degrade gracefully to the full list instead of an
  // empty screen.
  assert.deepEqual(ids('mystery:box'), [
    'chat-1',
    'chat-2',
    'chat-3',
    'chat-4',
  ]);
});

test('chat organization is wired through the backend boundary and sidebar', async () => {
  const [lib, backend, controller, sidebar, screen, modal] = await Promise.all([
    read('src-tauri/src/lib.rs'),
    read('src/lib/backend.ts'),
    read('src/app/useAppController.ts'),
    read('src/features/chats/components/ChatSidebar.tsx'),
    read('src/features/chats/ChatsScreen.tsx'),
    read('src/features/chats/components/ChatTagsModal.tsx'),
  ]);

  assert.match(lib, /fn assign_chat_tags/);
  assert.match(lib, /fn mark_chat_read/);
  assert.match(lib, /mark_chat_read,\s*\n\s*assign_chat_tags,/);
  assert.match(backend, /invokeBackend<number>\('assign_chat_tags'/);
  assert.match(backend, /invokeBackend<number>\('mark_chat_read'/);
  assert.match(controller, /assignTagsToChats/);
  assert.match(controller, /markChatReadBackend\(chatId\)/);
  assert.match(sidebar, /listChatCollections/);
  assert.match(sidebar, /chatsInCollection/);
  assert.match(screen, /ChatTagsModal/);
  assert.match(screen, /generatingChatIds/);
  assert.match(modal, /onApply/);
});
