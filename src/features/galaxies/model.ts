import type {
  CharacterData,
  DefinitionSection,
  GalaxyItem,
  GalaxyItemData,
  GalaxyItemInput,
  GalaxyKind,
  NamedValue,
  PersonaData,
  PromptBlock,
  PromptConfig,
  PromptPresetId,
  PromptPriority,
  StyleData,
  UniverseData,
  WorldbookData,
  WorldbookEntry,
} from '../../types';
import type { TranslationKey } from '../../i18n';

type StylePresetOption = {
  id: CharacterData['stylePreset'];
  labelKey: TranslationKey<'galaxies'>;
  descriptionKey: TranslationKey<'galaxies'>;
};

export const stylePresets = [
  {
    id: 'neutral',
    labelKey: 'style.neutral',
    descriptionKey: 'style.description.neutral',
  },
  {
    id: 'warm',
    labelKey: 'style.warm',
    descriptionKey: 'style.description.warm',
  },
  {
    id: 'concise',
    labelKey: 'style.concise',
    descriptionKey: 'style.description.concise',
  },
  {
    id: 'short-messages',
    labelKey: 'style.shortMessages',
    descriptionKey: 'style.description.shortMessages',
  },
  {
    id: 'long-messages',
    labelKey: 'style.longMessages',
    descriptionKey: 'style.description.longMessages',
  },
  {
    id: 'casual-lowercase',
    labelKey: 'style.casualLowercase',
    descriptionKey: 'style.description.casualLowercase',
  },
  {
    id: 'roleplay-rich',
    labelKey: 'style.roleplayRich',
    descriptionKey: 'style.description.roleplayRich',
  },
  {
    id: 'telegram-human',
    labelKey: 'style.telegramHuman',
    descriptionKey: 'style.description.telegramHuman',
  },
  {
    id: 'roleplay',
    labelKey: 'style.roleplay',
    descriptionKey: 'style.description.roleplay',
  },
  {
    id: 'literary',
    labelKey: 'style.literary',
    descriptionKey: 'style.description.literary',
  },
  {
    id: 'custom',
    labelKey: 'style.custom',
    descriptionKey: 'style.description.custom',
  },
] as const satisfies readonly StylePresetOption[];

type StylePreset = CharacterData['stylePreset'];

export function createId() {
  return crypto.randomUUID();
}

export function emptyData(kind: GalaxyKind): GalaxyItemData {
  switch (kind) {
    case 'persona':
      return {
        gender: 'unspecified',
        age: '',
        pronouns: '',
        habits: '',
        preferences: '',
        communicationNotes: '',
        attributes: [],
      } satisfies PersonaData;
    case 'character':
      return {
        definitionSections: [],
        stylePreset: 'neutral',
        promptSetIds: [],
      } satisfies CharacterData;
    case 'universe':
      return { rules: [] } satisfies UniverseData;
    case 'worldbook':
      return { entries: [] } satisfies WorldbookData;
    case 'style':
      return { instructions: '', example: '' } satisfies StyleData;
    case 'prompt-set':
      return defaultPromptSet();
  }
}

export function createGalaxyDraft(
  kind: GalaxyKind = 'persona',
): GalaxyItemInput {
  return {
    kind,
    name: '',
    description: '',
    data: emptyData(kind),
  };
}

export function draftFromItem(item: GalaxyItem): GalaxyItemInput {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    description: item.description,
    data: normalizeData(item.kind, item.data),
  };
}

export function normalizeData(
  kind: GalaxyKind,
  data: GalaxyItemData,
): GalaxyItemData {
  const value =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const personaGender = normalizeGender(value.gender);

  switch (kind) {
    case 'persona':
      return {
        avatar: imageValue(value.avatar),
        gender: personaGender,
        age: stringValue(value.age),
        pronouns: stringValue(value.pronouns),
        habits: stringValue(value.habits),
        preferences: stringValue(value.preferences),
        communicationNotes: stringValue(value.communicationNotes),
        attributes: objectArray(value.attributes).map(
          (entry) =>
            ({
              id: stringValue(entry.id) || createId(),
              title: stringValue(entry.title),
              value: stringValue(entry.value),
            }) satisfies NamedValue,
        ),
      } satisfies PersonaData;

    case 'character': {
      const stylePreset = normalizeStylePreset(value.stylePreset);
      return {
        avatar: imageValue(value.avatar),
        definitionSections: normalizeSections(value.definitionSections),
        stylePreset,
        styleItemId:
          stylePreset === 'custom'
            ? stringValue(value.styleItemId) || undefined
            : undefined,
        promptSetIds: stringArray(value.promptSetIds),
      } satisfies CharacterData;
    }

    case 'universe':
      return {
        rules: normalizeSections(value.rules),
      } satisfies UniverseData;

    case 'worldbook':
      return {
        entries: objectArray(value.entries).map(
          (entry) =>
            ({
              id: stringValue(entry.id) || createId(),
              title: stringValue(entry.title),
              keywords: stringValue(entry.keywords),
              content: stringValue(entry.content),
              enabled:
                typeof entry.enabled === 'boolean' ? entry.enabled : true,
            }) satisfies WorldbookEntry,
        ),
      } satisfies WorldbookData;

    case 'style':
      return {
        instructions: stringValue(value.instructions),
        example: stringValue(value.example),
      } satisfies StyleData;
    case 'prompt-set':
      return normalizePromptSet(value);
  }
}

export function defaultPromptSet(): PromptConfig {
  return {
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
}

function normalizePromptSet(value: Record<string, unknown>): PromptConfig {
  const defaults = defaultPromptSet();
  const priorities =
    typeof value.contextPriorities === 'object' &&
    value.contextPriorities !== null &&
    !Array.isArray(value.contextPriorities)
      ? (value.contextPriorities as Record<string, unknown>)
      : {};
  return {
    recentMessageLimit: normalizeRecentMessageLimit(
      value.recentMessageLimit,
      defaults.recentMessageLimit,
    ),
    setIds: [],
    presetIds: stringArray(value.presetIds).filter(isPromptPreset),
    contextPriorities: {
      persona: normalizePriority(
        priorities.persona,
        defaults.contextPriorities.persona,
      ),
      character: normalizePriority(
        priorities.character,
        defaults.contextPriorities.character,
      ),
      universe: normalizePriority(
        priorities.universe,
        defaults.contextPriorities.universe,
      ),
      worldbooks: normalizePriority(
        priorities.worldbooks,
        defaults.contextPriorities.worldbooks,
      ),
      remembered: normalizePriority(
        priorities.remembered,
        defaults.contextPriorities.remembered,
      ),
      presets: normalizePriority(
        priorities.presets,
        defaults.contextPriorities.presets,
      ),
    },
    customBlocks: objectArray(value.customBlocks).map(
      (block) =>
        ({
          id: stringValue(block.id) || createId(),
          title: stringValue(block.title),
          content: stringValue(block.content),
          priority: normalizePriority(block.priority, 'normal'),
          enabled: typeof block.enabled === 'boolean' ? block.enabled : true,
        }) satisfies PromptBlock,
    ),
  };
}

function normalizeGender(value: unknown): PersonaData['gender'] {
  const gender = stringValue(value).trim().toLocaleLowerCase('ru-RU');
  if (['male', 'мужской', 'мужчина'].includes(gender)) return 'male';
  if (['female', 'женский', 'женщина'].includes(gender)) return 'female';
  return 'unspecified';
}

function normalizeRecentMessageLimit(value: unknown, fallback: number) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : fallback;
  return Number.isFinite(parsed)
    ? Math.min(500, Math.max(0, Math.floor(parsed)))
    : fallback;
}

function normalizePriority(
  value: unknown,
  fallback: PromptPriority,
): PromptPriority {
  const priority = stringValue(value);
  return ['low', 'normal', 'high', 'critical'].includes(priority)
    ? (priority as PromptPriority)
    : fallback;
}

function isPromptPreset(value: string): value is PromptPresetId {
  return [
    'human',
    'casual-brief',
    'casual-lowercase',
    'strict-lowercase',
    'dialogue-only',
    'no-emoji',
    'first-person',
    'concise',
    'immersive',
    'initiative',
    'continuity',
    'roleplay-actions',
    'no-user-control',
    'character-consistency',
    'scene-pacing',
    'telegram-chat',
  ].includes(value);
}

function normalizeSections(value: unknown): DefinitionSection[] {
  return objectArray(value).map((section) => ({
    id: stringValue(section.id) || createId(),
    title: stringValue(section.title),
    content: stringValue(section.content),
  }));
}

function normalizeStylePreset(value: unknown): StylePreset {
  const preset = stringValue(value);
  return stylePresets.some((entry) => entry.id === preset)
    ? (preset as StylePreset)
    : 'neutral';
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function imageValue(value: unknown) {
  const source = stringValue(value);
  return source.startsWith('data:image/') ? source : undefined;
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' && entry !== null && !Array.isArray(entry),
      )
    : [];
}
