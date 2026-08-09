import type {
  GalaxyItem,
  PromptBlock,
  PromptConfig,
  PromptContextPriorities,
  PromptPriority,
  PromptSetData,
} from '../../../../types';
import { promptPriorities, responseLengthModes } from '../../promptConfig';
import { translate, type TranslationKey } from '../../../../i18n';

function promptText(
  key: TranslationKey<'chats'>,
  variables?: Record<string, string | number>,
) {
  return translate('chats', key, variables);
}

export const priorityFields: Array<{
  id: keyof PromptContextPriorities;
  label: string;
  description: string;
}> = [
  {
    id: 'persona',
    get label() {
      return promptText('source.persona.label');
    },
    get description() {
      return promptText('source.persona.description');
    },
  },
  {
    id: 'character',
    get label() {
      return promptText('source.character.label');
    },
    get description() {
      return promptText('source.character.description');
    },
  },
  {
    id: 'universe',
    get label() {
      return promptText('source.universe.label');
    },
    get description() {
      return promptText('source.universe.description');
    },
  },
  {
    id: 'worldbooks',
    get label() {
      return promptText('source.worldbooks.label');
    },
    get description() {
      return promptText('source.worldbooks.description');
    },
  },
  {
    id: 'remembered',
    get label() {
      return promptText('source.memory.label');
    },
    get description() {
      return promptText('source.memory.description');
    },
  },
  {
    id: 'presets',
    get label() {
      return promptText('source.rules.label');
    },
    get description() {
      return promptText('source.rules.description');
    },
  },
];

export function createPromptBlock(): PromptBlock {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `prompt-${Date.now()}`,
    title: promptText('customBlock.defaultTitle'),
    content: '',
    priority: 'high',
    enabled: true,
  };
}

export function getPromptOrderPreview(
  value: PromptConfig,
  includeContext = true,
  sets: GalaxyItem[] = [],
  inheritedSetIds: string[] = [],
  activeContextFields?: Array<keyof PromptContextPriorities>,
) {
  const selectedIds = new Set([...(value.setIds ?? []), ...inheritedSetIds]);
  const selectedSets = sets.filter((set) => selectedIds.has(set.id));
  const setEntries = selectedSets.flatMap((set, setIndex) => {
    const config = set.data as PromptSetData;
    const entries: Array<{
      id: string;
      title: string;
      description: string;
      priority: PromptPriority;
      order: number;
    }> = [];

    if (config.presetIds?.length) {
      entries.push({
        id: `set:${set.id}:rules`,
        title: set.name,
        description: promptText('promptSet.ruleCount', {
          count: config.presetIds.length,
        }),
        priority: config.contextPriorities?.presets ?? 'normal',
        order: priorityFields.length + setIndex * 20,
      });
    }

    for (const [blockIndex, block] of (config.customBlocks ?? []).entries()) {
      if (!block.enabled || !block.content.trim()) continue;
      entries.push({
        id: `set:${set.id}:block:${block.id}`,
        title: block.title || set.name,
        description: promptText('promptSet.named', { name: set.name }),
        priority: block.priority,
        order: priorityFields.length + setIndex * 20 + blockIndex + 1,
      });
    }

    if (entries.length === 0) {
      entries.push({
        id: `set:${set.id}:empty`,
        title: set.name,
        description: promptText('promptSet.empty'),
        priority: 'normal',
        order: priorityFields.length + setIndex * 20,
      });
    }

    return entries;
  });
  const ownOrder = priorityFields.length + selectedSets.length * 20;
  const responseLength = responseLengthModes.find(
    (option) => option.id === (value.responseLength ?? 'auto'),
  );
  const responseLengthEntry =
    responseLength && responseLength.id !== 'auto'
      ? [
          {
            id: 'response-length',
            title: promptText('responseLength.sourceTitle'),
            description: promptText(responseLength.descriptionKey),
            priority: 'critical' as const,
            order: ownOrder + value.customBlocks.length + 1,
          },
        ]
      : [];

  return [
    ...(includeContext
      ? priorityFields
          .filter(
            (field) =>
              !activeContextFields || activeContextFields.includes(field.id),
          )
          .map((field, order) => ({
            id: field.id,
            title: field.label,
            description: field.description,
            priority: value.contextPriorities[field.id],
            order,
          }))
      : []),
    ...setEntries,
    ...value.customBlocks
      .filter((block) => block.enabled && block.content.trim())
      .map((block, order) => ({
        id: `custom:${block.id}`,
        title: block.title,
        description: promptText('promptSet.customInstruction'),
        priority: block.priority,
        order: ownOrder + order,
      })),
    ...responseLengthEntry,
  ].sort((left, right) => {
    const leftPriority = promptPriorities.findIndex(
      (priority) => priority.id === left.priority,
    );
    const rightPriority = promptPriorities.findIndex(
      (priority) => priority.id === right.priority,
    );
    return leftPriority - rightPriority || left.order - right.order;
  });
}
