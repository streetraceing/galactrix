import type { GalaxyKind } from '../../types';

export const galaxySections: Array<{ id: GalaxyKind; label: string }> = [
  { id: 'persona', label: 'Персоны' },
  { id: 'character', label: 'Персонажи' },
  { id: 'universe', label: 'Вселенные' },
  { id: 'worldbook', label: 'Ворлдбуки' },
  { id: 'style', label: 'Стили' },
  { id: 'prompt-set', label: 'Наборы промптов' },
];

export const galaxyFilters: Array<{ id: 'all' | GalaxyKind; label: string }> = [
  { id: 'all', label: 'Все' },
  ...galaxySections,
];

export const galaxyKindDescriptions: Record<GalaxyKind, string> = {
  persona:
    'Описывает пользователя: его устойчивые факты, привычки, предпочтения и особенности общения.',
  character:
    'Задаёт личность ассистента, подробное определение и постоянный стиль его сообщений.',
  universe:
    'Хранит правила мира, сеттинг и общие факты, действующие на протяжении всего чата.',
  worldbook:
    'Содержит отдельные записи лора, которые можно подключать к одному или нескольким чатам.',
  style:
    'Сохраняет переиспользуемые инструкции по тону, формату и манере переписки персонажа.',
  'prompt-set':
    'Объединяет правила и свои блоки промпта в переиспользуемый набор с заданным порядком и приоритетами.',
};

export const galaxyKindLabels: Record<GalaxyKind, string> = {
  persona: 'Персона',
  character: 'Персонаж',
  universe: 'Вселенная',
  worldbook: 'Ворлдбук',
  style: 'Стиль',
  'prompt-set': 'Набор промптов',
};

export const galaxyKindCreateLabels: Record<GalaxyKind, string> = {
  persona: 'персону',
  character: 'персонажа',
  universe: 'вселенную',
  worldbook: 'ворлдбук',
  style: 'стиль',
  'prompt-set': 'набор промптов',
};

export const galaxyKindIcons: Record<
  GalaxyKind,
  'user' | 'brain' | 'planet' | 'book' | 'sparkles' | 'database'
> = {
  persona: 'user',
  character: 'brain',
  universe: 'planet',
  worldbook: 'book',
  style: 'sparkles',
  'prompt-set': 'database',
};
