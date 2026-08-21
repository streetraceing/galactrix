import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('stale chat refreshes cannot overwrite a newer chat state', async () => {
  const source = await read('src/app/useAppController.ts');

  assert.match(source, /chatRefreshVersionsRef/);
  assert.match(
    source,
    /chatRefreshVersionsRef\.current\.get\(chatId\) !== version/,
  );
  assert.ok(
    source.indexOf('chatRefreshVersionsRef.current.get(chatId) !== version') <
      source.indexOf(
        'setSnapshot((current)',
        source.indexOf('const refreshChat'),
      ),
  );
});

test('generation jobs stay scoped while other chats remain usable', async () => {
  const [screen, composer, controller] = await Promise.all([
    read('src/features/chats/ChatsScreen.tsx'),
    read('src/features/chats/components/ChatComposer.tsx'),
    read('src/app/useAppController.ts'),
  ]);

  assert.match(screen, /generationForChat\(generationJobs, canvasChat\?\.id\)/);
  assert.match(screen, /canvasGenerationActive/);
  assert.doesNotMatch(screen, /generationBusyElsewhere/);
  assert.doesNotMatch(composer, /generationBlocked/);
  assert.match(controller, /generationJobsRef\.current\.some/);
  assert.match(controller, /errors\.generationInProgress/);
});

test('failed chat deletion keeps its local draft intact', async () => {
  const source = await read('src/features/chats/ChatsScreen.tsx');
  const deleteBlock = source.slice(
    source.indexOf("if (confirmTarget.type === 'delete')"),
    source.indexOf(
      '} else {',
      source.indexOf("if (confirmTarget.type === 'delete')"),
    ),
  );

  assert.ok(deleteBlock.indexOf('await onDeleteChat') >= 0);
  assert.ok(
    deleteBlock.indexOf('await onDeleteChat') <
      deleteBlock.indexOf('removeStorageItem'),
  );
});

test('chat generation number fields preserve editable drafts', async () => {
  const source = await read(
    'src/features/chats/components/ChatGenerationSettings.tsx',
  );

  assert.match(source, /const \[draft, setDraft\] = useState/);
  assert.match(source, /onBlur=\{normalizeDraft\}/);
  assert.match(source, /normalizeSettingValue/);
});
