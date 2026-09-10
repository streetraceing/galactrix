import type { TranslationKey } from '../../i18n';

type ChatsKey = TranslationKey<'chats'>;

export type ContextReportMode = 'send' | 'regenerate' | 'continue';

export const INSPECTOR_SECTION_KEYS: Record<string, ChatsKey> = {
  persona: 'inspector.section.persona',
  character: 'inspector.section.character',
  style: 'inspector.section.style',
  universe: 'inspector.section.universe',
  worldbook: 'inspector.section.worldbook',
  promptSet: 'inspector.section.promptSet',
  promptSetBlock: 'inspector.section.promptSetBlock',
  responseRules: 'inspector.section.responseRules',
  responseLength: 'inspector.section.responseLength',
  remembered: 'inspector.section.remembered',
  custom: 'inspector.section.custom',
};

export const INSPECTOR_TRUNCATION_KEYS: Record<string, ChatsKey> = {
  dynamicContext: 'inspector.truncation.dynamicContext',
  recentMessageLimit: 'inspector.truncation.recentMessageLimit',
  contextBudget: 'inspector.truncation.contextBudget',
};

export const INSPECTOR_CLEANUP_KEYS: Record<string, ChatsKey> = {
  collapseBlankLines: 'inspector.cleanup.collapseBlankLines',
  removeDuplicatedTail: 'inspector.cleanup.removeDuplicatedTail',
};

export const INSPECTOR_REASON_KEYS: Record<string, ChatsKey> = {
  contextBudget: 'inspector.reason.contextBudget',
};

export const INSPECTOR_MODE_KEYS: Record<ContextReportMode, ChatsKey> = {
  send: 'inspector.mode.send',
  regenerate: 'inspector.mode.regenerate',
  continue: 'inspector.mode.continue',
};
