import type { TranslationKey } from '../../i18n';
import type { PromptConfig, PromptPresetId, PromptPriority } from '../../types';

type PromptPresetOption = {
  id: PromptPresetId;
  labelKey: TranslationKey<'chats'>;
  descriptionKey: TranslationKey<'chats'>;
};

type PromptBundleOption = {
  id: string;
  labelKey: TranslationKey<'chats'>;
  descriptionKey: TranslationKey<'chats'>;
  presetIds: readonly PromptPresetId[];
};

type PromptPriorityOption = {
  id: PromptPriority;
  labelKey: TranslationKey<'chats'>;
  descriptionKey: TranslationKey<'chats'>;
};

export const promptPresets = [
  {
    id: 'human',
    labelKey: 'promptRule.livingLanguage.label',
    descriptionKey: 'promptRule.livingLanguage.description',
  },
  {
    id: 'casual-brief',
    labelKey: 'promptRule.casualBrief.label',
    descriptionKey: 'promptRule.casualBrief.description',
  },
  {
    id: 'casual-lowercase',
    labelKey: 'promptRule.casualLowercase.label',
    descriptionKey: 'promptRule.casualLowercase.description',
  },
  {
    id: 'strict-lowercase',
    labelKey: 'promptRule.strictLowercase.label',
    descriptionKey: 'promptRule.strictLowercase.description',
  },
  {
    id: 'dialogue-only',
    labelKey: 'promptRule.dialogueOnly.label',
    descriptionKey: 'promptRule.dialogueOnly.description',
  },
  {
    id: 'no-emoji',
    labelKey: 'promptRule.noEmoji.label',
    descriptionKey: 'promptRule.noEmoji.description',
  },
  {
    id: 'first-person',
    labelKey: 'promptRule.firstPerson.label',
    descriptionKey: 'promptRule.firstPerson.description',
  },
  {
    id: 'roleplay-actions',
    labelKey: 'promptRule.roleplayActions.label',
    descriptionKey: 'promptRule.roleplayActions.description',
  },
  {
    id: 'no-user-control',
    labelKey: 'promptRule.noUserControl.label',
    descriptionKey: 'promptRule.noUserControl.description',
  },
  {
    id: 'character-consistency',
    labelKey: 'promptRule.characterConsistency.label',
    descriptionKey: 'promptRule.characterConsistency.description',
  },
  {
    id: 'scene-pacing',
    labelKey: 'promptRule.scenePacing.label',
    descriptionKey: 'promptRule.scenePacing.description',
  },
  {
    id: 'telegram-chat',
    labelKey: 'promptRule.telegramChat.label',
    descriptionKey: 'promptRule.telegramChat.description',
  },
  {
    id: 'concise',
    labelKey: 'promptRule.concise.label',
    descriptionKey: 'promptRule.concise.description',
  },
  {
    id: 'immersive',
    labelKey: 'promptRule.immersive.label',
    descriptionKey: 'promptRule.immersive.description',
  },
  {
    id: 'initiative',
    labelKey: 'promptRule.proactive.label',
    descriptionKey: 'promptRule.proactive.description',
  },
  {
    id: 'continuity',
    labelKey: 'promptRule.strictContinuity.label',
    descriptionKey: 'promptRule.strictContinuity.description',
  },
] as const satisfies readonly PromptPresetOption[];

export const promptBundles = [
  {
    id: 'natural-dialogue',
    labelKey: 'promptBundle.naturalDialogue.label',
    descriptionKey: 'promptBundle.naturalDialogue.description',
    presetIds: [
      'human',
      'casual-brief',
      'first-person',
      'no-emoji',
      'dialogue-only',
      'continuity',
    ],
  },
  {
    id: 'focused-assistant',
    labelKey: 'promptBundle.focusedAssistant.label',
    descriptionKey: 'promptBundle.focusedAssistant.description',
    presetIds: ['human', 'concise', 'continuity', 'no-emoji'],
  },
  {
    id: 'relaxed-chat',
    labelKey: 'promptBundle.relaxedChat.label',
    descriptionKey: 'promptBundle.relaxedChat.description',
    presetIds: [
      'human',
      'casual-brief',
      'casual-lowercase',
      'dialogue-only',
      'continuity',
    ],
  },
  {
    id: 'minimal-chat',
    labelKey: 'promptBundle.minimalChat.label',
    descriptionKey: 'promptBundle.minimalChat.description',
    presetIds: [
      'casual-brief',
      'concise',
      'dialogue-only',
      'no-emoji',
      'continuity',
    ],
  },
  {
    id: 'telegram-chat',
    labelKey: 'promptBundle.telegramChat.label',
    descriptionKey: 'promptBundle.telegramChat.description',
    presetIds: [
      'human',
      'casual-brief',
      'strict-lowercase',
      'telegram-chat',
      'dialogue-only',
      'continuity',
    ],
  },
  {
    id: 'roleplay-balanced',
    labelKey: 'promptBundle.roleplayBalanced.label',
    descriptionKey: 'promptBundle.roleplayBalanced.description',
    presetIds: [
      'human',
      'first-person',
      'roleplay-actions',
      'no-user-control',
      'character-consistency',
      'scene-pacing',
      'continuity',
    ],
  },
  {
    id: 'roleplay-immersive',
    labelKey: 'promptBundle.roleplayImmersive.label',
    descriptionKey: 'promptBundle.roleplayImmersive.description',
    presetIds: [
      'human',
      'first-person',
      'roleplay-actions',
      'no-user-control',
      'character-consistency',
      'immersive',
      'scene-pacing',
      'continuity',
    ],
  },
  {
    id: 'roleplay-proactive',
    labelKey: 'promptBundle.roleplayProactive.label',
    descriptionKey: 'promptBundle.roleplayProactive.description',
    presetIds: [
      'human',
      'first-person',
      'roleplay-actions',
      'no-user-control',
      'character-consistency',
      'immersive',
      'initiative',
      'scene-pacing',
      'continuity',
    ],
  },
  {
    id: 'roleplay-dialogue',
    labelKey: 'promptBundle.roleplayDialogue.label',
    descriptionKey: 'promptBundle.roleplayDialogue.description',
    presetIds: [
      'human',
      'first-person',
      'no-user-control',
      'character-consistency',
      'dialogue-only',
      'continuity',
    ],
  },
] as const satisfies readonly PromptBundleOption[];

export function matchingPromptBundleId(
  presetIds: readonly PromptPresetId[],
): string | null {
  const selected = new Set(presetIds);
  const match = promptBundles.find(
    (bundle) =>
      bundle.presetIds.length === presetIds.length &&
      bundle.presetIds.every((presetId) => selected.has(presetId)),
  );
  return match?.id ?? null;
}

export const promptPriorities = [
  {
    id: 'low',
    labelKey: 'priority.low.label',
    descriptionKey: 'priority.low.description',
  },
  {
    id: 'normal',
    labelKey: 'priority.normal.label',
    descriptionKey: 'priority.normal.description',
  },
  {
    id: 'high',
    labelKey: 'priority.high.label',
    descriptionKey: 'priority.high.description',
  },
  {
    id: 'critical',
    labelKey: 'priority.critical.label',
    descriptionKey: 'priority.critical.description',
  },
] as const satisfies readonly PromptPriorityOption[];

export const defaultPromptConfig: PromptConfig = {
  recentMessageLimit: 50,
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
    recentMessageLimit: Math.max(
      0,
      Math.floor(config.recentMessageLimit ?? 50),
    ),
    setIds: [...(config.setIds ?? [])],
    presetIds: [...config.presetIds],
    contextPriorities: { ...config.contextPriorities },
    customBlocks: config.customBlocks.map((block) => ({ ...block })),
  };
}
