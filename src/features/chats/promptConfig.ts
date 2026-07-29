import type { PromptConfig, PromptPresetId, PromptPriority } from '../../types';
import { i18next } from '../../i18n';

export const promptPresets: Array<{
  id: PromptPresetId;
  label: string;
  description: string;
}> = [
  {
    id: 'human',
    get label() {
      return i18next.t('promptRule.livingLanguage.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.livingLanguage.description', {
        ns: 'chats',
      });
    },
  },
  {
    id: 'dialogue-only',
    get label() {
      return i18next.t('promptRule.dialogueOnly.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.dialogueOnly.description', { ns: 'chats' });
    },
  },
  {
    id: 'no-emoji',
    get label() {
      return i18next.t('promptRule.noEmoji.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.noEmoji.description', { ns: 'chats' });
    },
  },
  {
    id: 'first-person',
    get label() {
      return i18next.t('promptRule.firstPerson.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.firstPerson.description', { ns: 'chats' });
    },
  },
  {
    id: 'concise',
    get label() {
      return i18next.t('promptRule.concise.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.concise.description', { ns: 'chats' });
    },
  },
  {
    id: 'immersive',
    get label() {
      return i18next.t('promptRule.immersive.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.immersive.description', { ns: 'chats' });
    },
  },
  {
    id: 'initiative',
    get label() {
      return i18next.t('promptRule.proactive.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.proactive.description', { ns: 'chats' });
    },
  },
  {
    id: 'continuity',
    get label() {
      return i18next.t('promptRule.strictContinuity.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('promptRule.strictContinuity.description', {
        ns: 'chats',
      });
    },
  },
];

export const promptPriorities: Array<{
  id: PromptPriority;
  label: string;
  description: string;
}> = [
  {
    id: 'low',
    get label() {
      return i18next.t('priority.low.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('priority.low.description', { ns: 'chats' });
    },
  },
  {
    id: 'normal',
    get label() {
      return i18next.t('priority.normal.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('priority.normal.description', { ns: 'chats' });
    },
  },
  {
    id: 'high',
    get label() {
      return i18next.t('priority.high.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('priority.high.description', { ns: 'chats' });
    },
  },
  {
    id: 'critical',
    get label() {
      return i18next.t('priority.critical.label', { ns: 'chats' });
    },
    get description() {
      return i18next.t('priority.critical.description', { ns: 'chats' });
    },
  },
];

export const defaultPromptConfig: PromptConfig = {
  setIds: [],
  presetIds: [],
  contextPriorities: {
    persona: 'normal',
    character: 'critical',
    universe: 'high',
    worldbooks: 'normal',
    remembered: 'high',
    presets: 'high',
  },
  customBlocks: [],
};

export function clonePromptConfig(config: PromptConfig): PromptConfig {
  return {
    setIds: [...(config.setIds ?? [])],
    presetIds: [...config.presetIds],
    contextPriorities: { ...config.contextPriorities },
    customBlocks: config.customBlocks.map((block) => ({ ...block })),
  };
}
