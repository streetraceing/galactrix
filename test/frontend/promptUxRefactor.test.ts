import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('assembly order renders as a directional step list instead of flat rows', async () => {
  const source = await read(
    'src/features/chats/components/prompt-builder/PromptOrderSection.tsx',
  );
  assert.match(source, /promptOrderSection\.background/);
  assert.match(source, /promptOrderSection\.mostImportant/);
  assert.match(source, /grid-cols-\[2\.25rem_minmax\(0,1fr\)\]/);
  assert.match(source, /border-accent\/20 bg-accent\/10/);
});

test('chat response length is a persistent prompt setting with strict micro mode', async () => {
  const [types, setup, config, models, builder, db] = await Promise.all([
    read('src/types.ts'),
    read('src/features/chats/components/ChatSetupModal.tsx'),
    read('src/features/chats/promptConfig.ts'),
    read('src-tauri/src/models.rs'),
    read('src-tauri/src/prompt_builder.rs'),
    read('src-tauri/src/db.rs'),
  ]);

  assert.match(
    types,
    /ResponseLengthMode = 'auto' \| 'micro' \| 'short' \| 'long'/,
  );
  assert.match(setup, /chatSetupModal\.responseLength/);
  assert.match(config, /id: 'micro'/);
  assert.match(models, /pub response_length: String/);
  assert.match(builder, /CHAT RESPONSE LENGTH/);
  assert.match(builder, /roughly 2-14 words/);
  assert.match(db, /"auto" \| "micro" \| "short" \| "long"/);
});
