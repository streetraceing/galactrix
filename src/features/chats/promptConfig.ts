import type { PromptConfig, PromptPresetId, PromptPriority } from '../../types';

export const promptPresets: Array<{
  id: PromptPresetId;
  label: string;
  description: string;
}> = [
  {
    id: 'human',
    label: 'Живой язык',
    description:
      'Естественный ритм, конкретные формулировки и минимум ассистентского тона.',
  },
  {
    id: 'dialogue-only',
    label: 'Только реплики',
    description:
      'Без действий, ремарок, звёздочек и повествования от третьего лица.',
  },
  {
    id: 'no-emoji',
    label: 'Без эмодзи',
    description: 'Запрещает эмодзи, эмотиконы и декоративные символы.',
  },
  {
    id: 'first-person',
    label: 'От первого лица',
    description:
      'Персонаж говорит от своего имени и не решает действия пользователя.',
  },
  {
    id: 'concise',
    label: 'Лаконичность',
    description: 'Убирает повторы, лишние резюме и необязательные отступления.',
  },
  {
    id: 'immersive',
    label: 'Погружение',
    description:
      'Поддерживает атмосферу сцены, детали мира и эмоциональную непрерывность.',
  },
  {
    id: 'initiative',
    label: 'Инициативность',
    description:
      'Позволяет персонажу двигать разговор вперёд без управления пользователем.',
  },
  {
    id: 'continuity',
    label: 'Строгая непрерывность',
    description:
      'Проверяет ответ на соответствие фактам, отношениям и текущей сцене.',
  },
];

export const promptPriorities: Array<{
  id: PromptPriority;
  label: string;
  description: string;
}> = [
  { id: 'low', label: 'Низкий', description: 'Фоновая рекомендация' },
  { id: 'normal', label: 'Обычный', description: 'Стандартное правило' },
  { id: 'high', label: 'Высокий', description: 'Важное ограничение' },
  {
    id: 'critical',
    label: 'Критический',
    description: 'Главное правило конфигурации',
  },
];

export const defaultPromptConfig: PromptConfig = {
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
    setIds: [...(config.setIds ?? [])],
    presetIds: [...config.presetIds],
    contextPriorities: { ...config.contextPriorities },
    customBlocks: config.customBlocks.map((block) => ({ ...block })),
  };
}
