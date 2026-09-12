import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildChatJson,
  buildChatMarkdown,
  chatExportFilename,
} from '../../src/features/chats/chatExport';
import type { Chat, Message } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

const NOW = new Date('2026-09-13T12:00:00Z');

function chat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'chat-1',
    title: 'Mars Colony',
    preview: '',
    updatedAt: 0,
    messageCount: 0,
    pinned: false,
    archived: false,
    autoTitle: false,
    tags: ['story'],
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

function message(overrides: Partial<Message> & { id: string }): Message {
  return {
    chatId: 'chat-1',
    role: 'user',
    content: 'Hello',
    createdAt: 1,
    updatedAt: 1,
    edited: false,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
    ...overrides,
  };
}

const LABELS = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  exportedFrom: 'Exported from Galactrix',
};

test('markdown export renders an ordered readable transcript', () => {
  const markdown = buildChatMarkdown(
    chat({ title: 'Mars Colony' }),
    [
      message({
        id: 'm2',
        role: 'assistant',
        content: ' Greetings! ',
        createdAt: 20,
      }),
      message({
        id: 'm1',
        role: 'user',
        content: 'Hello there',
        createdAt: 10,
      }),
    ],
    LABELS,
    NOW,
  );

  assert.match(markdown, /^# Mars Colony\n/);
  assert.match(markdown, /Exported from Galactrix .* · 2/);
  // Messages are ordered by time regardless of input order.
  assert.ok(markdown.indexOf('Hello there') < markdown.indexOf('Greetings!'));
  assert.match(markdown, /\*\*User\*\* · /);
  assert.match(markdown, /\*\*Assistant\*\* · /);
  assert.equal(markdown.includes('Greetings!\n'), true);
});

test('json export keeps full fidelity including variants and reports', () => {
  const exported = buildChatJson(
    chat({ tags: ['story', 'work'] }),
    [
      message({
        id: 'a1',
        role: 'assistant',
        content: 'Reply',
        createdAt: 5,
        activeVariantIndex: 1,
        variants: [
          {
            id: 'v0',
            index: 0,
            content: 'First draft',
            createdAt: 5,
            rating: 2,
            note: 'weak',
          },
          {
            id: 'v1',
            index: 1,
            content: 'Reply',
            createdAt: 6,
            report: {
              createdAt: 9,
              providerId: 'p',
              providerName: 'Lab',
              model: 'm',
              mode: 'send',
              estimatedTokens: {
                systemTokens: 1,
                historyTokens: 2,
                totalTokens: 3,
              },
              sections: [],
              promptRules: [],
              truncations: [],
              modules: {
                dynamicContext: false,
                dynamicContextAnalysis: false,
                semanticMemory: false,
                semanticMemorySelected: 0,
                repetitionGuard: false,
                responseCleanup: [],
              },
            },
          },
        ],
      }),
    ],
    NOW,
  );

  assert.equal(exported.format, 'galactrix-chat');
  assert.equal(exported.version, 1);
  const payload = exported as {
    chat: { title: string; tags: string[] };
    messages: Array<{
      variants: Array<{
        rating: number | null;
        note: string | null;
        report: unknown;
      }>;
    }>;
  };
  assert.deepEqual(payload.chat.tags, ['story', 'work']);
  assert.equal(payload.messages[0].variants.length, 2);
  assert.equal(payload.messages[0].variants[0].rating, 2);
  assert.equal(payload.messages[0].variants[1].note, null);
  assert.notEqual(payload.messages[0].variants[1].report, null);
});

test('export filenames slugify the title and pick the right extension', () => {
  assert.equal(
    chatExportFilename(chat({ title: 'Mars Colony!' }), 'markdown', NOW),
    'galactrix-chat-mars-colony-2026-09-13.md',
  );
  assert.equal(
    chatExportFilename(chat({ title: '///' }), 'json', NOW),
    'galactrix-chat-chat-2026-09-13.json',
  );
});

test('the export action is wired into both chat menus and reuses the text exporter', async () => {
  const [actions, screen, modal, transfer, jsonTransferTest] =
    await Promise.all([
      read('src/features/chats/components/ChatActions.tsx'),
      read('src/features/chats/ChatsScreen.tsx'),
      read('src/features/chats/components/ExportChatModal.tsx'),
      read('src/features/chats/chatExport.ts'),
      read('src/lib/jsonTransfer.ts'),
    ]);

  assert.match(actions, /onAction\('export', chat\)/);
  assert.match(actions, /run\('export'\)/);
  assert.match(screen, /ExportChatModal/);
  assert.match(screen, /setExportTarget\(chat\)/);
  assert.match(modal, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(modal, /min-h-14 w-full/);
  assert.match(transfer, /export function buildChatMarkdown/);
  assert.match(jsonTransferTest, /export async function exportTextFile/);
});
