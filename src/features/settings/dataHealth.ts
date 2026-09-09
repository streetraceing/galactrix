import type { TranslationKey } from '../../i18n';

type SettingsKey = TranslationKey<'settings'>;

export const HEALTH_ISSUE_KEYS: Record<
  string,
  { title: SettingsKey; description: SettingsKey }
> = {
  foreignKeyViolation: {
    title: 'dataHealth.issue.foreignKeyViolation',
    description: 'dataHealth.issue.foreignKeyViolationDescription',
  },
  chatProviderReference: {
    title: 'dataHealth.issue.chatProviderReference',
    description: 'dataHealth.issue.chatProviderReferenceDescription',
  },
  chatPersonaReference: {
    title: 'dataHealth.issue.chatPersonaReference',
    description: 'dataHealth.issue.chatPersonaReferenceDescription',
  },
  chatCharacterReference: {
    title: 'dataHealth.issue.chatCharacterReference',
    description: 'dataHealth.issue.chatCharacterReferenceDescription',
  },
  chatStyleReference: {
    title: 'dataHealth.issue.chatStyleReference',
    description: 'dataHealth.issue.chatStyleReferenceDescription',
  },
  chatUniverseReference: {
    title: 'dataHealth.issue.chatUniverseReference',
    description: 'dataHealth.issue.chatUniverseReferenceDescription',
  },
  chatWorldbookReference: {
    title: 'dataHealth.issue.chatWorldbookReference',
    description: 'dataHealth.issue.chatWorldbookReferenceDescription',
  },
  chatMessageCountDrift: {
    title: 'dataHealth.issue.chatMessageCountDrift',
    description: 'dataHealth.issue.chatMessageCountDriftDescription',
  },
  chatPreviewDrift: {
    title: 'dataHealth.issue.chatPreviewDrift',
    description: 'dataHealth.issue.chatPreviewDriftDescription',
  },
  assistantVariantMissing: {
    title: 'dataHealth.issue.assistantVariantMissing',
    description: 'dataHealth.issue.assistantVariantMissingDescription',
  },
  strayMessageVariants: {
    title: 'dataHealth.issue.strayMessageVariants',
    description: 'dataHealth.issue.strayMessageVariantsDescription',
  },
  activeVariantOutOfRange: {
    title: 'dataHealth.issue.activeVariantOutOfRange',
    description: 'dataHealth.issue.activeVariantOutOfRangeDescription',
  },
  activeVariantContentMismatch: {
    title: 'dataHealth.issue.activeVariantContentMismatch',
    description: 'dataHealth.issue.activeVariantContentMismatchDescription',
  },
  contextCursorDangling: {
    title: 'dataHealth.issue.contextCursorDangling',
    description: 'dataHealth.issue.contextCursorDanglingDescription',
  },
  semanticMemoryDanglingSource: {
    title: 'dataHealth.issue.semanticMemoryDanglingSource',
    description: 'dataHealth.issue.semanticMemoryDanglingSourceDescription',
  },
};

export const HEALTH_TABLE_KEYS: Record<string, SettingsKey> = {
  chats: 'dataHealth.table.chats',
  messages: 'dataHealth.table.messages',
  message_variants: 'dataHealth.table.variants',
  galaxy_items: 'dataHealth.table.galaxyItems',
  providers: 'dataHealth.table.providers',
  chat_worldbooks: 'dataHealth.table.worldbooks',
  chat_contexts: 'dataHealth.table.contexts',
  semantic_memories: 'dataHealth.table.memories',
  usage_events: 'dataHealth.table.usage',
};

export type ByteUnit =
  'byte' | 'kilobyte' | 'megabyte' | 'gigabyte' | 'terabyte';

export const HEALTH_UNIT_KEYS: Record<ByteUnit, SettingsKey> = {
  byte: 'dataHealth.unit.byte',
  kilobyte: 'dataHealth.unit.kilobyte',
  megabyte: 'dataHealth.unit.megabyte',
  gigabyte: 'dataHealth.unit.gigabyte',
  terabyte: 'dataHealth.unit.terabyte',
};

export function formatByteSize(bytes: number): {
  value: string;
  unit: ByteUnit;
} {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { value: '0', unit: 'byte' };
  }
  if (bytes < 1024) {
    return { value: String(bytes), unit: 'byte' };
  }
  const units: ByteUnit[] = ['kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  let scaled = bytes / 1024;
  let unitIndex = 0;
  while (Math.abs(scaled) >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  const unit = units[Math.min(unitIndex, units.length - 1)] ?? 'terabyte';
  const rounded = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1);
  return { value: rounded, unit };
}
