import type {
  PromptBlock,
  PromptConfig,
  PromptContextPriorities,
  PromptPresetId,
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
) {
  return [
    ...(includeContext
      ? priorityFields.map((field, order) => ({
          id: field.id,
          title: field.label,
          priority: value.contextPriorities[field.id],
          order,
        }))
      : []),
    ...value.customBlocks
      .filter((block) => block.enabled)
      .map((block, order) => ({
        id: block.id,
        title: block.title,
        priority: block.priority,
        order: priorityFields.length + order,
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
