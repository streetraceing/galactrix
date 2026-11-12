import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  describeGenerationError,
  generationRetryTarget,
  sanitizeGenerationDetail,
  markGenerationErrorReported,
  isReportedGenerationError,
  type GenerationFailure,
} from '../../src/features/chats/generationFailures.ts';
import type { Message } from '../../src/types.ts';
const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const backend = (
  status?: number,
  detail = '',
  key = 'backend.provider.httpError',
) =>
  Object.assign(new Error('localized error'), {
    key,
    variables: { status, detail },
  });
const failure: GenerationFailure = {
  id: 'f',
  chatId: 'chat',
  messageId: 'user',
  mode: 'send',
  kind: 'network',
  details: '',
};
const message = (
  id: string,
  role: Message['role'] = 'user',
  chatId = 'chat',
): Message => ({
  id,
  chatId,
  role,
  content: 'question',
  createdAt: 1,
  remembered: false,
  activeVariantIndex: 0,
  variants: [],
});

test('HTTP failures use actionable categories rather than a raw provider body', () => {
  for (const [status, kind] of [
    [401, 'auth'],
    [403, 'access'],
    [402, 'quota'],
    [429, 'rateLimit'],
    [408, 'timeout'],
    [504, 'timeout'],
    [503, 'server'],
    [413, 'context'],
    [404, 'model'],
    [400, 'settings'],
    [422, 'settings'],
  ] as const)
    assert.equal(describeGenerationError(backend(status)).kind, kind);
});
test('provider quota and context codes refine generic HTTP failures', () => {
  assert.equal(
    describeGenerationError(
      backend(
        429,
        '{"error":{"code":"insufficient_quota","message":"billing"}}',
      ),
    ).kind,
    'quota',
  );
  assert.equal(
    describeGenerationError(backend(400, 'context_length_exceeded')).kind,
    'context',
  );
  assert.equal(
    describeGenerationError(backend(429, 'apiKey rate limiting')).kind,
    'rateLimit',
  );
});
test('structured native errors are classified without guessing from arbitrary numbers', () => {
  assert.equal(
    describeGenerationError(
      backend(undefined, '', 'backend.provider.apiKeyMissing'),
    ).kind,
    'auth',
  );
  assert.equal(
    describeGenerationError(
      backend(undefined, '', 'backend.provider.emptyResponse'),
    ).kind,
    'empty',
  );
  assert.equal(
    describeGenerationError(
      backend(undefined, '', 'backend.provider.connectionFailed'),
    ).kind,
    'network',
  );
  assert.equal(
    describeGenerationError(new Error('request timed out')).kind,
    'timeout',
  );
  assert.equal(
    describeGenerationError(new Error('429 tokens remaining')).kind,
    'unknown',
  );
  assert.equal(
    describeGenerationError(backend(undefined, '', 'backend.message.notFound'))
      .kind,
    'unknown',
  );
});
test('diagnostics remove common credentials, URL passwords and query keys', () => {
  const source =
    'Authorization: Bearer SECRET123 api_key="HIDDEN_VALUE" https://user:password@host.test/v1?token=QUERYSECRET&x=1 sk-123456789abcdefgh';
  const safe = sanitizeGenerationDetail(source);
  for (const secret of [
    'SECRET123',
    'HIDDEN_VALUE',
    'password',
    'QUERYSECRET',
    'sk-123456789abcdefgh',
  ])
    assert.ok(!safe.includes(secret), secret);
  assert.match(safe, /redacted/);
});
test('JSON diagnostics extract only error metadata, not the request or arbitrary fields', () => {
  const safe = sanitizeGenerationDetail(
    JSON.stringify({
      error: {
        message: 'Unsupported parameter',
        code: 'invalid_parameter',
        request: { prompt: 'PRIVATE_CHAT' },
        api_key: 'PRIVATE_KEY',
      },
      request: 'PRIVATE_REQUEST',
    }),
  );
  assert.match(safe, /Unsupported parameter/);
  assert.doesNotMatch(safe, /PRIVATE_CHAT|PRIVATE_KEY|PRIVATE_REQUEST/);
  assert.equal(
    sanitizeGenerationDetail('<!DOCTYPE html><body>proxy page</body>'),
    '[HTML response omitted]',
  );
  assert.ok(sanitizeGenerationDetail('x'.repeat(100_000)).length <= 4000);
});
test('unknown failures are safe and plain text remains plain text', () => {
  assert.equal(describeGenerationError(null).kind, 'unknown');
  assert.equal(describeGenerationError('unexpected').details, 'unexpected');
  assert.equal(
    sanitizeGenerationDetail('{not valid JSON}'),
    '{not valid JSON}',
  );
});
test('only the persisted latest user turn is a send-retry target', () => {
  const user = message('user');
  assert.equal(generationRetryTarget(failure, [user]), 'user');
  assert.equal(generationRetryTarget(failure, []), undefined);
  assert.equal(
    generationRetryTarget(failure, [{ ...user, pending: true }]),
    undefined,
  );
  assert.equal(
    generationRetryTarget(failure, [message('user', 'user', 'other-chat')]),
    undefined,
  );
  assert.equal(
    generationRetryTarget(failure, [user, message('answer', 'assistant')]),
    undefined,
  );
  assert.equal(
    generationRetryTarget({ ...failure, retryBlocked: true }, [user]),
    undefined,
  );
});
test('continuation and regeneration retry only assistant messages', () => {
  assert.equal(
    generationRetryTarget({ ...failure, mode: 'continue' }, [message('user')]),
    undefined,
  );
  assert.equal(
    generationRetryTarget({ ...failure, mode: 'regenerate' }, [
      message('user'),
    ]),
    undefined,
  );
  assert.equal(
    generationRetryTarget({ ...failure, mode: 'continue' }, [
      message('user', 'assistant'),
    ]),
    'user',
  );
});
test('deduplication preserves the original structured error and persistence marker', () => {
  const error = Object.assign(backend(500), {
    variables: { messagePersisted: 'true' },
  });
  assert.equal(isReportedGenerationError(error), false);
  markGenerationErrorReported(error);
  assert.equal(isReportedGenerationError(error), true);
  assert.equal(error.variables.messagePersisted, 'true');
  assert.equal(isReportedGenerationError(new Error('other')), false);
  assert.doesNotThrow(() => markGenerationErrorReported('primitive'));
});
test('controller scopes failures to chats, clears on new work and guards cancellation/retries', () => {
  const source = read('src/app/useAppController.ts');
  assert.match(source, /failure.chatId !== context.chatId/);
  assert.match(source, /failure.chatId !== job.chatId/);
  assert.match(source, /\.slice\(-50\)/);
  assert.match(source, /job.status === 'cancelling'/);
  assert.match(source, /retryingFailuresRef.current.has/);
  assert.match(source, /retryBlocked: !recovered/);
  assert.match(source, /Boolean\(retry\)/);
  assert.match(source, /userMessageId = retry\?\.messageId/);
  assert.match(source, /customInstruction,/);
});
test('backend send retry validates existing history instead of inserting a second user message', () => {
  const rust = read('src-tauri/src/lib.rs');
  assert.match(rust, /if retry_user_message.unwrap_or\(false\)/);
  assert.match(rust, /db::validate_user_message_retry/);
  assert.match(rust, /else \{\s*db::add_user_message/);
  const db = read('src-tauri/src/db.rs');
  const validation = db.slice(
    db.indexOf('pub(crate) fn validate_user_message_retry'),
    db.indexOf('pub fn add_user_message'),
  );
  assert.match(validation, /ensure_chat_mutable/);
  assert.match(validation, /ORDER BY created_at DESC, rowid DESC LIMIT 1/);
  assert.match(validation, /role == "user" && saved == content/);
  assert.doesNotMatch(validation, /INSERT|UPDATE|DELETE/);
  assert.match(read('src/lib/backend.ts'), /retryUserMessage/);
});
test('failure UI reuses HeroUI and the shared modal, bounds long text and avoids duplicate toasts', () => {
  const notice = read(
    'src/features/chats/components/GenerationFailureNotice.tsx',
  );
  assert.match(notice, /<Alert/);
  assert.match(notice, /<UiModal/);
  assert.match(notice, /role="alert"/);
  assert.match(notice, /min-h-10/);
  assert.match(notice, /flex-wrap/);
  assert.match(notice, /max-h-\[40dvh\]/);
  assert.match(notice, /whitespace-pre-wrap wrap-anywhere/);
  assert.match(notice, /inFlight.current/);
  assert.match(notice, /sanitizeGenerationDetail/);
  assert.doesNotMatch(
    notice,
    /dangerouslySetInnerHTML|localStorage|setTimeout/,
  );
  const chats = read('src/features/chats/ChatsScreen.tsx');
  assert.match(chats, /failure.chatId === canvasChat\?\.id/);
  assert.match(chats, /!isReportedGenerationError\(error\)/);
});
