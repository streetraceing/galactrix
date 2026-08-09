import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clonePromptConfig,
  defaultPromptConfig,
  responseLengthModes,
} from '../../src/features/chats/promptConfig.ts';

test('chat response length defaults to automatic and clones independently', () => {
  assert.equal(defaultPromptConfig.responseLength, 'auto');
  assert.deepEqual(
    responseLengthModes.map((option) => option.id),
    ['auto', 'micro', 'short', 'long'],
  );

  const clone = clonePromptConfig({
    ...defaultPromptConfig,
    responseLength: 'micro',
  });
  assert.equal(clone.responseLength, 'micro');
  assert.notEqual(clone, defaultPromptConfig);
});
