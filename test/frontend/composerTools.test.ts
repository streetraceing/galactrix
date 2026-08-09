import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertBoldText,
  insertDialogueQuote,
  insertOocAside,
  insertRoleplayAction,
} from '../../src/features/chats/composerTools.ts';

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

test('composer formatting tools keep the caret inside empty wrappers', () => {
  const bold = insertBoldText('hello', 5, 5);
  assert.equal(bold.value, 'hello ****');
  assert.equal(bold.selectionStart, 8);
  assert.equal(bold.selectionEnd, 8);

  const quote = insertDialogueQuote('', 0, 0);
  assert.equal(quote.value, '“”');
  assert.equal(quote.selectionStart, 1);

  const ooc = insertOocAside('note', 0, 4);
  assert.equal(ooc.value, '((note))');
  assert.equal(ooc.selectionStart, 2);
  assert.equal(ooc.selectionEnd, 6);
});
