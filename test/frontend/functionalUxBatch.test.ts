import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('composer exposes one desktop tools menu and the same mobile long-press actions', async () => {
  const source = await read('src/features/chats/components/ChatComposer.tsx');
  assert.match(source, /desktopToolsButton/);
  assert.match(source, /<Dropdown>[\s\S]*?magic-wand/);
  assert.match(source, /<ContextMenu[\s\S]*?<ContextMenuTrigger/);
  for (const action of ['roleplay', 'bold', 'quote', 'ooc', 'fullscreen']) {
    assert.match(source, new RegExp(`runToolAction\\('${action}'`));
  }
  assert.match(source, /copyDraft/);
  assert.match(source, /clearDraft/);
  assert.match(source, /fullscreenTitle/);
  assert.match(source, /variant="tertiary"/);
  assert.doesNotMatch(source, /title=\{t\('chatComposer\.tools'\)\}/);
});

test('galaxy editors advertise real template variables', async () => {
  const [hint, generation] = await Promise.all([
    read('src/features/galaxies/components/editors/TemplateVariablesHint.tsx'),
    read('src-tauri/src/generation_context.rs'),
  ]);
  assert.match(hint, /\{\{user\}\}/);
  assert.match(hint, /\{\{char\}\}/);
  assert.match(generation, /resolve_placeholders/);
  assert.match(generation, /profile_name/);
});

test('character styles include short and long messaging preferences', async () => {
  const [model, types, promptBuilder, validation] = await Promise.all([
    read('src/features/galaxies/model.ts'),
    read('src/types.ts'),
    read('src-tauri/src/prompt_builder.rs'),
    read('src-tauri/src/db/galaxy.rs'),
  ]);
  for (const id of ['short-messages', 'long-messages']) {
    assert.match(model, new RegExp(id));
    assert.match(types, new RegExp(id));
    assert.match(promptBuilder, new RegExp(id));
    assert.match(validation, new RegExp(id));
  }
});

test('new chats can keep their title automatic while existing chats remain named', async () => {
  const [modal, db] = await Promise.all([
    read('src/features/chats/components/ChatSetupModal.tsx'),
    read('src-tauri/src/db.rs'),
  ]);
  assert.match(modal, /usesAutomaticTitle/);
  assert.match(modal, /automaticTitle/);
  assert.match(modal, /title: usesAutomaticTitle \? ''/);
  assert.match(db, /resolve_new_chat_title/);
  assert.match(db, /existing_count \+ 1/);
});

test('chat copies reuse the automatic character title sequence', async () => {
  const [controller, db] = await Promise.all([
    read('src/app/useAppController.ts'),
    read('src-tauri/src/db.rs'),
  ]);

  assert.match(controller, /const title = input\?\.title\.trim\(\) \?\? ''/);
  assert.match(
    db,
    /resolve_chat_title\(connection, title, source\.2\.as_deref\(\)\)/,
  );
});
