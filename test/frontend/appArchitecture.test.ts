import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createDefaultSettings,
  createEmptySnapshot,
} from '../../src/app/appState';
import { navigationItems } from '../../src/app/navigation';
import {
  reconcileChatMessages,
  selectMessageVariantInSnapshot,
  sortChats,
} from '../../src/features/chats/chatState';
import { errorMessage } from '../../src/lib/errors';
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '../../src/lib/storage';
import type { Chat, Message, PromptConfig } from '../../src/types';

const promptConfig: PromptConfig = {
  recentMessageLimit: 24,
  setIds: [],
  presetIds: [],
  contextPriorities: {
    persona: 'normal',
    character: 'normal',
    universe: 'normal',
    worldbooks: 'normal',
    remembered: 'normal',
    presets: 'normal',
  },
  customBlocks: [],
};

function chat(
  id: string,
  updatedAt: number,
  pinned = false,
  preview = '',
): Chat {
  return {
    id,
    title: id,
    preview,
    updatedAt,
    messageCount: 0,
    pinned,
    worldbookIds: [],
    promptConfig,
  };
}

function message(
  id: string,
  chatId: string,
  content: string,
  overrides: Partial<Message> = {},
): Message {
  return {
    id,
    chatId,
    role: 'assistant',
    content,
    createdAt: 10,
    remembered: false,
    activeVariantIndex: 0,
    variants: [],
    ...overrides,
  };
}

test('application defaults are fresh and keep feature modules independent', () => {
  const first = createDefaultSettings();
  const second = createDefaultSettings();

  first.aiModules.retry.maxAttempts = 99;
  assert.equal(second.aiModules.retry.maxAttempts, 3);
  assert.notEqual(first.aiModules, second.aiModules);

  const snapshot = createEmptySnapshot();
  assert.deepEqual(snapshot.chats, []);
  assert.deepEqual(snapshot.messages, []);
  assert.equal(snapshot.settings.themeVariant, 'default');
  assert.equal(snapshot.settings.focusComposerAfterSend, true);
});

test('chat state transformations are deterministic and preserve stable objects', () => {
  const ordered = sortChats([
    chat('old', 10),
    chat('pinned', 1, true),
    chat('new', 20),
  ]);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ['pinned', 'new', 'old'],
  );

  const stable = message('stable', 'chat', 'unchanged');
  const pending = message('pending', 'chat', '', { pending: true });
  const other = message('other', 'other-chat', 'keep me');
  const reconciled = reconcileChatMessages([other, stable, pending], 'chat', [
    { ...stable },
    message('pending', 'chat', 'finished', { createdAt: 99 }),
  ]);

  assert.equal(reconciled[0], other);
  assert.equal(reconciled[1], stable);
  assert.equal(reconciled[2]?.createdAt, pending.createdAt);
  assert.equal(reconciled[2]?.pending, undefined);
});

test('variant selection updates the message and only the latest chat preview', () => {
  const first = message('first', 'chat', 'first', {
    variants: [
      { id: 'v0', index: 0, content: 'first', createdAt: 1 },
      { id: 'v1', index: 1, content: 'selected', createdAt: 2 },
    ],
  });
  const latest = message('latest', 'chat', 'latest');
  const snapshot = {
    ...createEmptySnapshot(),
    chats: [chat('chat', 1, false, 'latest')],
    messages: [first, latest],
  };

  const olderSelection = selectMessageVariantInSnapshot(
    snapshot,
    first.id,
    1,
    50,
  );
  assert.equal(olderSelection.messages[0]?.content, 'selected');
  assert.equal(olderSelection.messages[0]?.updatedAt, 50);
  assert.equal(olderSelection.chats[0]?.preview, 'latest');

  const latestWithVariants = {
    ...latest,
    variants: [
      { id: 'l0', index: 0, content: 'latest', createdAt: 1 },
      { id: 'l1', index: 1, content: 'new preview', createdAt: 2 },
    ],
  };
  const latestSnapshot = {
    ...snapshot,
    messages: [first, latestWithVariants],
  };
  const latestSelection = selectMessageVariantInSnapshot(
    latestSnapshot,
    latest.id,
    1,
    60,
  );
  assert.equal(latestSelection.chats[0]?.preview, 'new preview');
});

test('catalogs stay declarative and translations remain at the view boundary', async () => {
  assert.deepEqual(
    navigationItems.map((item) => item.labelKey),
    [
      'navigation.chats',
      'navigation.galaxies',
      'navigation.telescope',
      'navigation.profile',
      'navigation.settings',
    ],
  );

  const [
    navigationSource,
    promptConfigSource,
    galaxyCatalogSource,
    controllerSource,
  ] = await Promise.all([
    readFile(new URL('../../src/app/navigation.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../../src/features/chats/promptConfig.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src/features/galaxies/catalog.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src/app/useAppController.ts', import.meta.url),
      'utf8',
    ),
  ]);
  assert.doesNotMatch(navigationSource, /i18next/);
  assert.doesNotMatch(promptConfigSource, /i18next|translate\(/);
  assert.doesNotMatch(galaxyCatalogSource, /i18next|translate\(/);
  assert.match(controllerSource, /useApplicationPreferences/);
  assert.match(controllerSource, /runExistingMessageGeneration/);
  assert.doesNotMatch(controllerSource, /document\.documentElement/);
});

test('unknown errors share one predictable display conversion', () => {
  assert.equal(errorMessage(new Error('failed')), 'failed');
  assert.equal(errorMessage('failed'), 'failed');
  assert.equal(errorMessage(42), '42');
});

test('browser persistence is safe when storage is unavailable', () => {
  assert.equal(readStorageItem('missing'), null);
  assert.doesNotThrow(() => writeStorageItem('key', 'value'));
  assert.doesNotThrow(() => removeStorageItem('key'));
});
