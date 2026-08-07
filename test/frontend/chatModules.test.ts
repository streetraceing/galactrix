import assert from 'node:assert/strict';
import test from 'node:test';
import {
  effectiveChatModuleEnabled,
  setChatModuleOverride,
} from '../../src/features/chats/chatModules';
import type { AiModuleSettings } from '../../src/types';

const settings: AiModuleSettings = {
  retry: {
    enabled: true,
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 6000,
  },
  dynamicContext: {
    enabled: false,
    mode: 'hybrid',
    directMessageLimit: 28,
    summaryBatchSize: 24,
    triggerMessages: 40,
    analysisPrompt: 'analyze',
  },
  semanticMemory: {
    enabled: false,
    topK: 8,
    similarityThreshold: 0.55,
    batchSize: 16,
    includeRememberedMessages: true,
    includeDynamicContext: true,
    indexArchivedMessages: true,
    archivedMessageLimit: 800,
  },
  contextBudget: {
    enabled: false,
    maxCharacters: 48_000,
    preserveRecentMessages: 12,
  },
  repetitionGuard: {
    enabled: false,
    recentAssistantMessages: 4,
    maxCharactersPerMessage: 600,
  },
  responseCleanup: {
    enabled: false,
    collapseBlankLines: true,
    removeDuplicatedTail: true,
  },
};

test('chat modules inherit global state until explicitly overridden', () => {
  assert.equal(effectiveChatModuleEnabled(settings, {}, 'retry'), true);
  assert.equal(
    effectiveChatModuleEnabled(settings, {}, 'contextBudget'),
    false,
  );
  assert.equal(
    effectiveChatModuleEnabled(settings, { retry: false }, 'retry'),
    false,
  );
  assert.equal(
    effectiveChatModuleEnabled(
      settings,
      { contextBudget: true },
      'contextBudget',
    ),
    true,
  );
});

test('matching the global state removes a redundant chat override', () => {
  const disabled = setChatModuleOverride(settings, {}, 'retry', false);
  assert.deepEqual(disabled, { retry: false });

  const inheritedAgain = setChatModuleOverride(
    settings,
    disabled,
    'retry',
    true,
  );
  assert.deepEqual(inheritedAgain, {});
});
