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
import { i18next } from '../../i18n';

export const stylePresets = [
  {
    id: 'neutral',
    get label() {
      return i18next.t('style.neutral', { ns: 'galaxies' });
    },
  },
  {
    id: 'warm',
    get label() {
      return i18next.t('style.warm', { ns: 'galaxies' });
    },
  },
  {
    id: 'concise',
    get label() {
      return i18next.t('style.concise', { ns: 'galaxies' });
    },
  },
  {
    id: 'casual-lowercase',
    get label() {
      return i18next.t('style.casualLowercase', { ns: 'galaxies' });
    },
  },
  {
    id: 'roleplay',
    get label() {
      return i18next.t('style.roleplay', { ns: 'galaxies' });
    },
  },
  {
    id: 'literary',
    get label() {
      return i18next.t('style.literary', { ns: 'galaxies' });
    },
  },
  {
    id: 'custom',
    get label() {
      return i18next.t('style.custom', { ns: 'galaxies' });
    },
  },
] as const;

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
        pronouns: pronounsForGender(personaGender),
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

    case 'character':
      return {
        avatar: imageValue(value.avatar),
        definitionSections: normalizeSections(value.definitionSections),
        stylePreset: normalizeStylePreset(value.stylePreset),
        styleItemId: stringValue(value.styleItemId) || undefined,
        promptSetIds: stringArray(value.promptSetIds),
      } satisfies CharacterData;

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

export function pronounsForGender(gender: PersonaData['gender']) {
  if (gender === 'male') {
    return i18next.t('gender.pronouns.male', { ns: 'galaxies' });
  }
  if (gender === 'female') {
    return i18next.t('gender.pronouns.female', { ns: 'galaxies' });
  }
  return '';
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
    'dialogue-only',
    'no-emoji',
    'first-person',
    'concise',
    'immersive',
    'initiative',
    'continuity',
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
