import type {
  GalaxyItem,
  PromptBlock,
  PromptConfig,
  PromptContextPriorities,
  PromptPresetId,
  PromptPriority,
  PromptSetData,
} from '../../../../types';
import { promptPriorities } from '../../promptConfig';

export const priorityFields: Array<{
  id: keyof PromptContextPriorities;
  label: string;
  description: string;
}> = [
  {
    id: 'persona',
    label: 'Персона пользователя',
    description: 'Сведения о {{user}}',
  },
  {
    id: 'character',
    label: 'Персонаж',
    description: 'Личность и поведение {{char}}',
  },
  {
    id: 'universe',
    label: 'Вселенная',
    description: 'Законы и факты мира',
  },
  {
    id: 'worldbooks',
    label: 'Ворлдбуки',
    description: 'Подключённые записи лора',
  },
  {
    id: 'remembered',
    label: 'Память',
    description: 'Сообщения, отмеченные как важные',
  },
  {
    id: 'presets',
    label: 'Правила ответа',
    description: 'Выбранные ограничения формата',
  },
];

export const livingDialogueBundle: PromptPresetId[] = [
  'human',
  'first-person',
  'no-emoji',
  'dialogue-only',
  'continuity',
];

export function createPromptBlock(): PromptBlock {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `prompt-${Date.now()}`,
    title: 'Новая инструкция',
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
        description: `Набор · ${config.presetIds.length} правил`,
        priority: config.contextPriorities?.presets ?? 'normal',
        order: priorityFields.length + setIndex * 20,
      });
    }

    for (const [blockIndex, block] of (config.customBlocks ?? []).entries()) {
      if (!block.enabled || !block.content.trim()) continue;
      entries.push({
        id: `set:${set.id}:block:${block.id}`,
        title: block.title || set.name,
        description: `Набор «${set.name}»`,
        priority: block.priority,
        order: priorityFields.length + setIndex * 20 + blockIndex + 1,
      });
    }

    if (entries.length === 0) {
      entries.push({
        id: `set:${set.id}:empty`,
        title: set.name,
        description: 'Подключённый набор пока пуст',
        priority: 'normal',
        order: priorityFields.length + setIndex * 20,
      });
    }

    return entries;
  });
  const ownOrder = priorityFields.length + selectedSets.length * 20;

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
        description: 'Своя инструкция',
        priority: block.priority,
        order: ownOrder + order,
      })),
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
