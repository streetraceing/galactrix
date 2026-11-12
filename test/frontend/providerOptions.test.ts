import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  compatiblePresets,
  parseJsonObject,
  parseProviderOptions,
} from '../../src/features/telescope/providerOptions.ts';
const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('legacy provider options are optional', () => {
  assert.equal(parseProviderOptions(undefined), undefined);
  assert.equal(parseProviderOptions(null), undefined);
  assert.deepEqual(parseProviderOptions({}), {});
  assert.deepEqual(
    parseProviderOptions({
      reasoningEffort: null,
      thinkingBudget: 0,
      seed: 0,
      noAuth: false,
    }),
    { thinkingBudget: 0, seed: 0, noAuth: false },
  );
});
test('advanced options retain nested overrides and clone independently', () => {
  const source = {
    reasoningEffort: 'high',
    extraBody: {
      temperature: null,
      chat_template_kwargs: { enable_thinking: false },
    },
    embeddingExtraBody: { input_type: 'search_document' },
    embeddingDimensions: 1024,
  };
  const copy = parseProviderOptions(source)!;
  assert.deepEqual(copy, source);
  assert.notEqual(copy.extraBody, source.extraBody);
});
test('malformed imported provider options are rejected', () => {
  for (const v of [
    [],
    'x',
    { seed: 1.5 },
    { thinkingBudget: -2 },
    { topK: 0 },
    { embeddingDimensions: 0 },
    { reasoningEffort: 'turbo' },
    { headers: { foo: 2 } },
    { extraBody: [] },
    { stop: [''] },
    { extraBody: { stream: false } },
    { thinkingLevel: 'low', thinkingBudget: 0 },
  ])
    assert.throws(() => parseProviderOptions(v));
});
test('JSON body overrides are objects and support null removal', () => {
  assert.deepEqual(parseJsonObject(''), {});
  assert.deepEqual(parseJsonObject('{"temperature":null}'), {
    temperature: null,
  });
  for (const text of ['null', '[]', '{', '1'])
    assert.throws(() => parseJsonObject(text));
});
test('compatible presets contain no API keys', () => {
  for (const preset of compatiblePresets) {
    assert.doesNotThrow(() => parseProviderOptions(preset.options));
    assert.ok(new URL(preset.baseUrl));
    assert.doesNotMatch(JSON.stringify(preset), /apiKey|sk-/);
  }
});
test('modal actions remain horizontal and footer buttons cannot autofocus-scroll', () => {
  const modal = read('src/components/ui/UiModal.tsx');
  assert.match(modal, /ui-modal-mobile-footer[^"\n]*flex-row flex-wrap/);
  assert.match(modal, /body\.contains\(active\)/);
  assert.match(modal, /body\.scrollTop/);
  assert.match(
    read('src/App.css'),
    /\.ui-modal-mobile-body\s*\{\s*overflow-anchor: none/,
  );
  for (const name of ['ChatTagsModal', 'ExportChatModal'])
    assert.doesNotMatch(
      read(`src/features/chats/components/${name}.tsx`),
      /\bautoFocus\b/,
    );
});
test('provider options persist and streaming uses the shared wire builder', () => {
  const db = read('src-tauri/src/db.rs');
  assert.match(db, /options_json = excluded.options_json/);
  assert.match(db, /DELETE FROM semantic_memories WHERE embedding_provider_id/);
  assert.match(
    read('src/features/telescope/transfer.ts'),
    /parseProviderOptions\(provider.options\)/,
  );
  const client = read('src-tauri/src/provider_client.rs');
  assert.equal(
    (client.match(/completion_body\(provider, &messages, true\)/g) ?? [])
      .length,
    2,
  );
  const request = read('src-tauri/src/provider_client/request.rs');
  assert.match(request, /thinking_level/);
  assert.match(request, /thinking_budget/);
  assert.match(request, /embedding_extra_body/);
});

test('embedding validation resolves the crate-level provider support module', () => {
  const client = read('src-tauri/src/provider_client.rs');
  const root = read('src-tauri/src/lib.rs');
  assert.match(root, /^mod provider_support;/m);
  assert.doesNotMatch(client, /^use crate::provider_support;/m);
  assert.match(
    client,
    /crate::provider_support::validate_options\(&provider.options\)/,
  );
  assert.doesNotMatch(client, /^mod provider_support;/m);
});
