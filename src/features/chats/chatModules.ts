import type {
  AiModuleId,
  AiModuleSettings,
  ChatModuleOverrides,
} from '../../types';

export function globalModuleEnabled(
  settings: AiModuleSettings,
  moduleId: AiModuleId,
): boolean {
  switch (moduleId) {
    case 'retry':
      return settings.retry.enabled;
    case 'dynamicContext':
      return settings.dynamicContext.enabled;
    case 'semanticMemory':
      return settings.semanticMemory.enabled;
    case 'contextBudget':
      return settings.contextBudget.enabled;
    case 'repetitionGuard':
      return settings.repetitionGuard.enabled;
    case 'responseCleanup':
      return settings.responseCleanup.enabled;
  }
}

export function effectiveChatModuleEnabled(
  settings: AiModuleSettings,
  overrides: ChatModuleOverrides,
  moduleId: AiModuleId,
): boolean {
  return overrides[moduleId] ?? globalModuleEnabled(settings, moduleId);
}

export function setChatModuleOverride(
  settings: AiModuleSettings,
  overrides: ChatModuleOverrides,
  moduleId: AiModuleId,
  enabled: boolean,
): ChatModuleOverrides {
  const next = { ...overrides };
  if (enabled === globalModuleEnabled(settings, moduleId)) {
    delete next[moduleId];
  } else {
    next[moduleId] = enabled;
  }
  return next;
}
