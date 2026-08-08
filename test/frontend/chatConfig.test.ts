import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activePromptSources,
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

test('built-in character ignores a stale saved style reference', () => {
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

  assert.equal(effectiveStyleItemId(config, [character]), undefined);
});

test('chat config round-trip preserves a direct style selection', () => {
  const chat: Chat = {
    id: 'chat-1',
    title: 'Chat',
    preview: '',
    updatedAt: 0,
    messageCount: 0,
    pinned: false,
    styleItemId: 'style-1',
    moduleOverrides: { retry: false, contextBudget: true },
    worldbookIds: [],
    promptConfig: defaultPromptConfig,
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
