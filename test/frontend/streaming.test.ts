import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('provider client streams SSE and Ollama payloads with cancellation support', async () => {
  const [client, retry, lib] = await Promise.all([
    read('src-tauri/src/provider_client.rs'),
    read('src-tauri/src/provider_client/retry.rs'),
    read('src-tauri/src/lib.rs'),
  ]);

  assert.match(client, /pub async fn complete_streaming/);
  assert.match(client, /pub\(crate\) struct StreamChunkParser/);
  assert.match(client, /"stream": true/);
  assert.match(client, /"stream_options": \{ "include_usage": true \}/);
  // A provider that answers with plain JSON falls back to buffered parsing.
  assert.match(client, /fall back to the buffered completion path/);
  // A cancelled stream keeps the partial text instead of dropping it.
  assert.match(client, /cancelled = true;/);
  assert.match(retry, /pub\(super\) async fn send_with_retry_raw/);
  assert.match(lib, /fn resolve_streamed/);
  assert.match(
    lib,
    /result\.cancelled && result\.completion\.content\.trim\(\)\.is_empty\(\)/,
  );
  // All three generation paths stream through an IPC channel.
  for (const command of [
    'regenerate_message',
    'continue_message',
    'send_chat_message',
  ]) {
    assert.match(
      lib,
      new RegExp(`fn ${command}[\\s\\S]{0,220}Channel<StreamDelta>`),
    );
    assert.match(lib, /channel\.send\(StreamDelta \{/);
  }
});

test('the webview renders deltas incrementally over a scoped IPC channel', async () => {
  const [backend, controller] = await Promise.all([
    read('src/lib/backend.ts'),
    read('src/app/useAppController.ts'),
  ]);

  assert.match(backend, /import \{ Channel, invoke \}/);
  assert.match(backend, /function streamChannel/);
  for (const command of [
    'send_chat_message',
    'regenerate_message',
    'continue_message',
  ]) {
    assert.match(
      backend,
      new RegExp(
        `invokeBackend<void>\\('${command}'[\\s\\S]{0,80}channel: streamChannel`,
      ),
    );
  }
  // Send appends into the existing optimistic placeholder; regenerations and
  // continuations arrive by message id and are replaced or created in place.
  assert.match(controller, /const applyStreamedText = useCallback/);
  assert.match(controller, /streamed \+= delta\.delta;/);
  assert.match(controller, /streamedByMessage\.set\(delta\.messageId, text\)/);
  assert.match(
    controller,
    /onDelta\?: \(delta: GenerationStreamDelta\) => void,/,
  );
});
