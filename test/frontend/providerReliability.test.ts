import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEditorEpoch } from '../../src/features/telescope/editorEpoch.ts';
const read = (p: string) =>
  readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('late credentials from another editor session cannot overwrite the current connection', async () => {
  const epoch = createEditorEpoch();
  let release!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    release = resolve;
  });
  epoch.begin();
  const old = epoch.snapshot();
  let token = '';
  const load = pending.then((value) => {
    if (epoch.isCurrent(old)) token = value;
  });
  epoch.begin();
  token = 'connection-B';
  release('connection-A');
  await load;
  assert.equal(token, 'connection-B');
});
test('editing credentials or vector settings invalidates a running probe', async () => {
  const epoch = createEditorEpoch();
  epoch.begin();
  const ticket = epoch.snapshot();
  let applied = false;
  const request = Promise.resolve().then(() => {
    applied = epoch.isCurrent(ticket);
  });
  epoch.edit();
  await request;
  assert.equal(applied, false);
  assert.equal(epoch.isSession(ticket), true);
});
test('closing and reopening invalidates every pending response', () => {
  const epoch = createEditorEpoch();
  epoch.begin();
  const ticket = epoch.snapshot();
  epoch.begin();
  assert.equal(epoch.isCurrent(ticket), false);
  assert.equal(epoch.isSession(ticket), false);
});
test('editor guards asynchronous results and distinguishes cleared from untouched keys', () => {
  const s = read('src/features/telescope/useProviderEditor.ts');
  assert.match(s, /tokenEdited\.current \? token\.trim\(\) : undefined/);
  assert.match(s, /if \(epoch\.isCurrent\(ticket\)\) setTokenState\(secret\)/);
  assert.match(
    s,
    /if \(epoch\.isCurrent\(ticket\)\) setEmbeddingProbe\(result\)/,
  );
  assert.match(s, /epoch\.edit\(\)/);
  assert.match(s, /setEmbeddingProbe\(null\)/);
});
test('stop sequences are committed on change, including keyboard confirmation', () => {
  const s = read(
    'src/features/telescope/components/ProviderAdvancedSettings.tsx',
  );
  assert.match(s, /function StopSequencesField/);
  assert.doesNotMatch(s, /onBlur=/);
  assert.match(s, /onChange\(event\.target\.value\.split/);
});
test('embedding-only probes and no-auth resolution are independent of chat configuration', () => {
  const lib = read('src-tauri/src/lib.rs');
  const support = read('src-tauri/src/provider_support.rs');
  assert.match(lib, /validate_embedding_input\(&provider\)/);
  assert.equal(
    (
      support.match(
        /if\s+provider\.options\.no_auth\s*\{\s*return\s+Ok\(None\);\s*\}/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(lib, /secure_storage::delete_provider_secret\(&id\)/);
});
test('vector cache updates are atomic and generation-only options do not change its identity', () => {
  const db = read('src-tauri/src/db.rs');
  assert.match(db, /SAVEPOINT provider_config_write/);
  assert.match(db, /ROLLBACK TO SAVEPOINT provider_config_write/);
  assert.match(db, /p\.options\.embedding_extra_body/);
  const identity = db.slice(
    db.indexOf('let identity ='),
    db.indexOf('if identity(&previous)'),
  );
  assert.doesNotMatch(
    identity,
    /reasoning_effort|thinking_budget|p\.options\.extra_body\b/,
  ); // embedding_extra_body is allowed below
  assert.match(db, /options: provider_options_from_row\(row\)\?/);
});
test('legacy batches use single-input requests and dimensions reach both embedding protocols', () => {
  const client = read('src-tauri/src/provider_client.rs');
  assert.match(client, /std::slice::from_ref\(input\)/);
  assert.match(client, /embeddings\.extend\(result\.embeddings\)/);
  const request = read('src-tauri/src/provider_client/request.rs');
  const options = request.slice(
    request.indexOf('pub(super) fn embedding_options'),
  );
  assert.match(options, /body\["dimensions"\]/);
  assert.doesNotMatch(options, /if !ollama/);
  assert.match(
    read('src-tauri/src/provider_client/endpoints.rs'),
    /fn models_endpoint/,
  );
  assert.match(client, /endpoints::models_endpoint\(provider\)/);
});

test('IPC preserves explicit empty credentials for clear and probe operations', () => {
  const backend = read('src/lib/backend.ts');
  assert.equal((backend.match(/apiKey: apiKey \?\? null/g) ?? []).length, 3);
  assert.doesNotMatch(backend, /apiKey: apiKey \|\| null/);
});
