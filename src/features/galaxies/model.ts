import type {
  CharacterData,
  DefinitionSection,
  GalaxyItem,
  GalaxyItemData,
  GalaxyItemInput,
  GalaxyKind,
  NamedValue,
  PersonaData,
  StyleData,
  UniverseData,
  WorldbookData,
  WorldbookEntry,
} from '../../types';

export const stylePresets = [
  { id: 'neutral', label: 'Нейтральный' },
  { id: 'warm', label: 'Тёплый' },
  { id: 'concise', label: 'Краткий' },
  { id: 'roleplay', label: 'Ролевой' },
  { id: 'literary', label: 'Литературный' },
  { id: 'custom', label: 'Свой пресет' },
] as const;

type StylePreset = CharacterData['stylePreset'];

export function createId() {
  return crypto.randomUUID();
}

export function emptyData(kind: GalaxyKind): GalaxyItemData {
  switch (kind) {
    case 'persona':
      return {
        gender: '',
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
      } satisfies CharacterData;
    case 'universe':
      return { rules: [] } satisfies UniverseData;
    case 'worldbook':
      return { entries: [] } satisfies WorldbookData;
    case 'style':
      return { instructions: '', example: '' } satisfies StyleData;
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

  switch (kind) {
    case 'persona':
      return {
        gender: stringValue(value.gender),
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

    case 'character':
      return {
        definitionSections: normalizeSections(value.definitionSections),
        stylePreset: normalizeStylePreset(value.stylePreset),
        styleItemId: stringValue(value.styleItemId) || undefined,
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
  }
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

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' && entry !== null && !Array.isArray(entry),
      )
    : [];
}
