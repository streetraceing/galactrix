import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  generationForChat,
  mergeGenerationJobs,
  withGenerationPlaceholder,
} from '../../src/features/chats/generationJobs';
import type { GenerationJob, Message } from '../../src/types';

function job(
  id: string,
  chatId: string,
  overrides: Partial<GenerationJob> = {},
): GenerationJob {
  return {
    id,
    chatId,
    messageId: `message-${id}`,
    mode: 'send',
    status: 'running',
    startedAt: 10,
    ...overrides,
  };
}

function message(id: string, chatId: string, pending = false): Message {
  return {
    id,
    chatId,
    role: 'assistant',
    content: pending ? '' : 'Complete',
    createdAt: 10,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
    pending: pending || undefined,
  };
}

test('send jobs derive exactly one recoverable placeholder', () => {
  const active = job('generation', 'chat');
  const first = withGenerationPlaceholder([], active);

  assert.equal(first.length, 1);
  assert.equal(first[0]?.id, active.messageId);
  assert.equal(first[0]?.pending, true);
  assert.equal(withGenerationPlaceholder(first, active), first);

  const committed = [message(active.messageId, active.chatId)];
  assert.equal(withGenerationPlaceholder(committed, active), committed);
});

test('regeneration and continuation never invent persisted messages', () => {
  const messages = [message('assistant', 'chat')];

  assert.equal(
    withGenerationPlaceholder(
      messages,
      job('regenerate', 'chat', { mode: 'regenerate' }),
    ),
    messages,
  );
  assert.equal(
    withGenerationPlaceholder(
      messages,
      job('continue', 'chat', { mode: 'continue' }),
    ),
    messages,
  );
});

test('jobs remain chat-scoped and remote state wins during recovery', () => {
  const local = job('local', 'chat-a', { startedAt: 20 });
  const remote = job('remote', 'chat-b', {
    status: 'cancelling',
    startedAt: 10,
  });
  const recovered = mergeGenerationJobs([remote], [local]);

  assert.deepEqual(
    recovered.map((item) => item.id),
    ['remote', 'local'],
  );
  assert.equal(generationForChat(recovered, 'chat-a'), local);
  assert.equal(generationForChat(recovered, 'chat-b'), remote);
  assert.equal(generationForChat(recovered, 'chat-c'), undefined);
});

test('backend and controller expose durable per-chat task management', async () => {
  const root = new URL('../../', import.meta.url);
  const [runtime, backend, controller, queue] = await Promise.all([
    readFile(new URL('src-tauri/src/runtime.rs', root), 'utf8'),
    readFile(new URL('src-tauri/src/lib.rs', root), 'utf8'),
    readFile(new URL('src/app/useAppController.ts', root), 'utf8'),
    readFile(
      new URL('src/components/layout/GenerationJobQueue.tsx', root),
      'utf8',
    ),
  ]);

  assert.match(runtime, /GENERATION_CHAT_BUSY/);
  assert.match(runtime, /cancel_chat_generation/);
  assert.match(runtime, /GenerationLease/);
  assert.match(runtime, /PRE_CANCEL_TTL_SECONDS/);
  assert.match(backend, /list_generation_jobs/);
  assert.match(backend, /await_cancellable/);
  assert.match(controller, /localGenerationIdsRef/);
  assert.match(controller, /syncGenerationJobs/);
  assert.match(controller, /generationJobsRef\.current\.some/);
  assert.match(queue, /jobs\.map/);
  assert.match(queue, /onOpenChat\(job\.chatId\)/);
  assert.match(queue, /onCancel\(generationId\)/);
});
