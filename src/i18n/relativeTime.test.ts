import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRelativeTimeForLocale } from './relativeTime.ts';

test('formats past relative time without a leading minus sign', () => {
  const value = formatRelativeTimeForLocale(700, 1_000, 'ru');
  assert.equal(value, '5 мин. назад');
  assert.equal(value.startsWith('-'), false);
});

test('formats future relative time using locale wording', () => {
  assert.equal(formatRelativeTimeForLocale(1_300, 1_000, 'en'), 'in 5 min.');
});
