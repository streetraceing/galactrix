import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { insertSnippetText } from '../../src/features/chats/composerTools';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('snippet insertion places content at the cursor with block separation', () => {
  // Empty draft: content lands verbatim.
  const into = insertSnippetText('', 0, 0, '  Hello there  ');
  assert.equal(into.value, 'Hello there');
  assert.equal(into.selectionStart, 'Hello there'.length);

  // Non-empty draft: a blank line separates the snippet from existing text.
  const appended = insertSnippetText('Prior text', 10, 10, 'Snippet body');
  assert.equal(appended.value, 'Prior text\n\nSnippet body');
  assert.equal(appended.selectionStart, 'Prior text\n\nSnippet body'.length);

  // Insertion at the cursor inside existing text, not just at the end.
  const middle = insertSnippetText('AB', 1, 1, 'X');
  assert.equal(middle.value, 'A\n\nX\n\nB');
});

test('snippets persist in settings and reach the composer picker', async () => {
  const [
    db,
    settingsStorage,
    models,
    appState,
    composer,
    panel,
    screen,
    router,
  ] = await Promise.all([
    read('src-tauri/src/db.rs'),
    read('src-tauri/src/db/settings.rs'),
    read('src-tauri/src/models.rs'),
    read('src/app/appState.ts'),
    read('src/features/chats/components/ChatComposer.tsx'),
    read('src/features/settings/components/SnippetsPanel.tsx'),
    read('src/features/settings/SettingsScreen.tsx'),
    read('src/app/AppScreenRouter.tsx'),
  ]);

  assert.match(db, /"app_settings",\s*"snippets_json"/);
  assert.match(settingsStorage, /snippets_json = \?23/);
  assert.match(models, /pub struct PromptSnippet/);
  assert.match(models, /pub snippets: Vec<PromptSnippet>/);
  assert.match(appState, /snippets: \[\],/);

  // Composer: tool action + picker wired with cursor-correct insertion.
  assert.match(
    composer,
    /case 'snippets':\s*\n\s*setSnippetPickerOpen\(true\);/,
  );
  assert.match(composer, /<SnippetPickerModal/);
  assert.match(composer, /insertSnippetText\(/);
  assert.match(composer, /snippets\.length > 0 \? \(/);
  // Settings: editing with reorder, delete confirm, and normalization caps.
  assert.match(panel, /moveItem\(snippets, index, step\)/);
  assert.match(panel, /setDeletingId\(snippet\.id\)/);
  assert.match(panel, /editor\.content\.length > MAX_CONTENT_LENGTH/);
  const appSettings = await read('src-tauri/src/app_settings.rs');
  assert.match(appSettings, /MAX_SNIPPET_CONTENT_LENGTH: usize = 12_000/);
  assert.match(screen, /SnippetsPanel/);
  assert.match(screen, /id: 'snippets'/);
  assert.match(router, /snippets=\{snapshot\.settings\.snippets\}/);
});
