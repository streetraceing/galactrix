import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activePromptSources,
  automaticChatTitle,
  chatConfigFromChat,
  effectiveStyleItemId,
} from '../../src/features/chats/chatConfig';
import {
  defaultPromptConfig,
  matchingPromptBundleId,
  promptBundles,
} from '../../src/features/chats/promptConfig';
import { normalizeData } from '../../src/features/galaxies/model';
import type { Chat, GalaxyItem } from '../../src/types';

function galaxyItem(
  id: string,
  kind: GalaxyItem['kind'],
  data: GalaxyItem['data'],
): GalaxyItem {
  return {
    id,
    kind,
    name: id,
    description: '',
    data,
    badge: '',
    accent: '',
    updatedAt: 0,
  };
}

test('chat style override wins over the character linked style', () => {
  const character = galaxyItem('character-1', 'character', {
    definitionSections: [],
    stylePreset: 'custom',
    styleItemId: 'style-character',
    promptSetIds: [],
  });
  const config = {
    title: 'Chat',
    characterId: character.id,
    styleItemId: 'style-chat',
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
  };

  assert.equal(effectiveStyleItemId(config, [character]), 'style-chat');
  assert.deepEqual(activePromptSources(config, []), ['character']);
});

test('character style remains the fallback when chat has no override', () => {
  const character = galaxyItem('character-1', 'character', {
    definitionSections: [],
    stylePreset: 'custom',
    styleItemId: 'style-character',
    promptSetIds: [],
  });
  const config = {
    title: 'Chat',
    characterId: character.id,
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
  };

  assert.equal(effectiveStyleItemId(config, [character]), 'style-character');
});

test('built-in character can layer a saved style reference', () => {
  const character = galaxyItem('character-1', 'character', {
    definitionSections: [],
    stylePreset: 'warm',
    styleItemId: 'style-stale',
    promptSetIds: [],
  });
  const config = {
    title: 'Chat',
    characterId: character.id,
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
  };

  assert.equal(effectiveStyleItemId(config, [character]), 'style-stale');
});

test('chat config round-trip preserves a direct style selection', () => {
  const chat: Chat = {
    id: 'chat-1',
    title: 'Chat',
    preview: '',
    updatedAt: 0,
    messageCount: 0,
    pinned: false,
    archived: false,
    autoTitle: false,
    styleItemId: 'style-1',
    moduleOverrides: { retry: false, contextBudget: true },
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
    generationSettings: {},
  };

  const config = chatConfigFromChat(chat);
  assert.equal(config.styleItemId, 'style-1');
  assert.deepEqual(config.moduleOverrides, {
    retry: false,
    contextBudget: true,
  });
});

test('persona normalization preserves explicit pronouns', () => {
  const normalized = normalizeData('persona', {
    gender: 'female',
    pronouns: 'they/them',
  });

  assert.equal('pronouns' in normalized && normalized.pronouns, 'they/them');
});

test('prompt bundle selection recognizes exact bundles and leaves manual mixes custom', () => {
  const focused = promptBundles.find(
    (bundle) => bundle.id === 'focused-assistant',
  );
  assert.ok(focused);
  assert.equal(matchingPromptBundleId(focused.presetIds), 'focused-assistant');
  assert.equal(
    matchingPromptBundleId([...focused.presetIds, 'first-person']),
    null,
  );
  assert.equal(matchingPromptBundleId(['human', 'human']), null);
});

test('automatic chat names use the selected character and its chat count', () => {
  const character = galaxyItem('character-1', 'character', {
    definitionSections: [],
    stylePreset: 'neutral',
    promptSetIds: [],
  });
  character.name = 'Alice';
  const chats: Chat[] = [
    {
      id: 'chat-1',
      title: 'Anything',
      preview: '',
      updatedAt: 0,
      messageCount: 0,
      pinned: false,
      archived: false,
      autoTitle: true,
      characterId: character.id,
      worldbookIds: [],
      promptConfig: defaultPromptConfig,
      generationSettings: {},
      moduleOverrides: {},
    },
  ];

  assert.equal(
    automaticChatTitle(character.id, chats, [character]),
    'Alice #2',
  );
  assert.equal(automaticChatTitle(undefined, chats, [character]), 'Chat #1');
  assert.equal(
    automaticChatTitle(undefined, chats, [character], undefined, 'Чат'),
    'Чат #1',
  );

  chats[0] = { ...chats[0], title: 'Alice #2' };
  assert.equal(
    automaticChatTitle(character.id, chats, [character]),
    'Alice #3',
  );
});
