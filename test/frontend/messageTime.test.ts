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

test('message rows prefer the last interaction time and mark edited content', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL(
      '../../src/features/chats/components/MessageList.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /message\.updatedAt && message\.updatedAt > 0/);
  assert.match(source, /message\.edited/);
  assert.match(source, /messageList\.edited/);
  assert.match(source, /message\.remembered/);

  const controller = await readFile(
    new URL('../../src/hooks/useAppController.ts', import.meta.url),
    'utf8',
  );
  assert.match(
    controller,
    /Boolean\(variant\.edited\) === Boolean\(candidate\.edited\)/,
  );
  assert.match(controller, /edited: Boolean\(selected\.edited\)/);
});
