import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildChatStats } from '../../src/features/chats/chatStats';
import type { Message } from '../../src/types';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

function message(overrides: Partial<Message> & { id: string }): Message {
  return {
    chatId: 'chat-1',
    role: 'user',
    content: '',
    createdAt: 0,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
    ...overrides,
  };
}

test('chat statistics aggregate roles, tokens, latency and activity days', () => {
  const report = (latency: number, input: number, output: number) => ({
    createdAt: 0,
    providerId: 'p',
    providerName: 'Lab',
    model: 'm',
    mode: 'send' as const,
    latencyMs: latency,
    reportedUsage: { inputTokens: input, outputTokens: output },
    estimatedTokens: { systemTokens: 10, historyTokens: 20, totalTokens: 30 },
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
  });

  const stats = buildChatStats([
    message({ id: 'u1', role: 'user', content: 'a', createdAt: 100 }),
    message({ id: 'u2', role: 'user', content: 'b', createdAt: 200 }),
    message({
      id: 'a1',
      role: 'assistant',
      content: 'r1',
      createdAt: 300,
      activeVariantIndex: 0,
      variants: [
        {
          id: 'v',
          index: 0,
          content: 'r1',
          createdAt: 300,
          report: report(800, 100, 50),
        },
      ],
    }),
    message({ id: 's1', role: 'system', content: 'sys', createdAt: 50 }),
    message({
      id: 'a2',
      role: 'assistant',
      content: 'r2',
      createdAt: 400 + 86_400,
      activeVariantIndex: 0,
      variants: [
        {
          id: 'v2',
          index: 0,
          content: 'r2',
          createdAt: 400 + 86_400,
          report: report(1_200, 120, 60),
        },
      ],
    }),
  ]);

  assert.equal(stats.total, 5);
  assert.equal(stats.userCount, 2);
  assert.equal(stats.assistantCount, 2);
  assert.equal(stats.systemCount, 1);
  assert.equal(stats.reportedInputTokens, 220);
  assert.equal(stats.reportedOutputTokens, 110);
  assert.equal(stats.estimatedTokens, 0);
  assert.equal(stats.avgLatencyMs, 1_000);
  assert.equal(stats.activeDays.length, 2);
  assert.equal(stats.firstMessageAt, 50);
  assert.equal(stats.lastMessageAt, 400 + 86_400);
});

test('empty conversations produce zeroed stats without errors', () => {
  const stats = buildChatStats([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.avgLatencyMs, null);
  assert.deepEqual(stats.activeDays, []);
  assert.equal(stats.firstMessageAt, null);
});

test('chat statistics are wired into the chat menus', async () => {
  const [statsModule, actions, screen] = await Promise.all([
    read('src/features/chats/chatStats.ts'),
    read('src/features/chats/components/ChatActions.tsx'),
    read('src/features/chats/ChatsScreen.tsx'),
  ]);

  assert.match(statsModule, /export function buildChatStats/);
  assert.match(actions, /onAction\('stats', chat\)/);
  assert.match(actions, /run\('stats'\)/);
  assert.match(screen, /<ChatStatsModal/);
});
