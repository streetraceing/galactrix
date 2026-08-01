import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMessageTime } from '../../src/features/chats/messageTime.ts';

test('message times use the active interface locale and runtime timezone', () => {
  const timestampSeconds = 1_700_000_000;
  const expected = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestampSeconds * 1_000));

  assert.equal(formatMessageTime(timestampSeconds, 'ru'), expected);
  assert.doesNotMatch(formatMessageTime(timestampSeconds, 'ru-RU'), /AM|PM/i);
});

test('english message times keep the english locale convention', () => {
  const timestampSeconds = 1_700_000_000;
  const expected = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h12',
  }).format(new Date(timestampSeconds * 1_000));

  assert.equal(formatMessageTime(timestampSeconds, 'en-US'), expected);
});

test('invalid message timestamps do not render misleading clock values', () => {
  assert.equal(formatMessageTime(Number.NaN, 'ru'), '');
});
