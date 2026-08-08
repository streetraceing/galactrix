import assert from 'node:assert/strict';
import test from 'node:test';
import { insertRoleplayAction } from '../../src/features/chats/composerTools';

test('roleplay action insertion places an empty caret between paired stars', () => {
  const result = insertRoleplayAction('hello', 5, 5);
  assert.equal(result.value, 'hello **');
  assert.equal(result.selectionStart, 7);
  assert.equal(result.selectionEnd, 7);
});

test('roleplay action insertion wraps and keeps selected text selected', () => {
  const result = insertRoleplayAction('wave now', 0, 4);
  assert.equal(result.value, '*wave* now');
  assert.equal(result.selectionStart, 1);
  assert.equal(result.selectionEnd, 5);
});
