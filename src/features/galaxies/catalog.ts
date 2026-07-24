import type { GalaxyKind } from '../../types';

export const galaxyFilters: Array<{ id: 'all' | GalaxyKind; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'persona', label: 'Персоны' },
  { id: 'character', label: 'Персонажи' },
  { id: 'universe', label: 'Вселенные' },
  { id: 'worldbook', label: 'Ворлдбуки' },
  { id: 'style', label: 'Стили' },
];

export const galaxyKindLabels: Record<GalaxyKind, string> = {
  persona: 'Персона',
  character: 'Персонаж',
  universe: 'Вселенная',
  worldbook: 'Ворлдбук',
  style: 'Стиль',
};

export const galaxyKindIcons: Record<
  GalaxyKind,
  'user' | 'brain' | 'planet' | 'book' | 'sparkles'
> = {
  persona: 'user',
  character: 'brain',
  universe: 'planet',
  worldbook: 'book',
  style: 'sparkles',
};
