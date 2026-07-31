import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptConfigPath = new URL(
  '../../src/features/chats/promptConfig.ts',
  import.meta.url,
);
const promptModelPath = new URL(
  '../../src/features/chats/components/prompt-builder/promptBuilderModel.ts',
  import.meta.url,
);

test('brief conversational style is built in and included in natural dialogue', async () => {
  const [config, model] = await Promise.all([
    readFile(promptConfigPath, 'utf8'),
    readFile(promptModelPath, 'utf8'),
  ]);

  assert.match(config, /id: 'casual-brief'/);
  assert.match(config, /promptRule\.casualBrief\.label/);
  assert.match(model, /livingDialogueBundle[\s\S]*'casual-brief'/);
});
