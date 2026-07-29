import type { GalaxyKind } from '../../types';
import { translate, type TranslationKey } from '../../i18n';

function galaxyText(key: TranslationKey<'galaxies'>) {
  return translate('galaxies', key);
}

export const galaxySections: Array<{ id: GalaxyKind; label: string }> = [
  {
    id: 'persona',
    get label() {
      return galaxyText('section.persona');
    },
  },
  {
    id: 'character',
    get label() {
      return galaxyText('section.character');
    },
  },
  {
    id: 'universe',
    get label() {
      return galaxyText('section.universe');
    },
  },
  {
    id: 'worldbook',
    get label() {
      return galaxyText('section.worldbook');
    },
  },
  {
    id: 'style',
    get label() {
      return galaxyText('section.style');
    },
  },
  {
    id: 'prompt-set',
    get label() {
      return galaxyText('section.promptSet');
    },
  },
];

export const galaxyFilters: Array<{ id: 'all' | GalaxyKind; label: string }> = [
  {
    id: 'all',
    get label() {
      return galaxyText('section.all');
    },
  },
  ...galaxySections,
];

export const galaxyKindDescriptions: Record<GalaxyKind, string> = {
  get persona() {
    return galaxyText('description.persona');
  },
  get character() {
    return galaxyText('description.character');
  },
  get universe() {
    return galaxyText('description.universe');
  },
  get worldbook() {
    return galaxyText('description.worldbook');
  },
  get style() {
    return galaxyText('description.style');
  },
  get 'prompt-set'() {
    return galaxyText('description.promptSet');
  },
};

export const galaxyKindLabels: Record<GalaxyKind, string> = {
  get persona() {
    return translate('common', 'galaxy.kind.persona');
  },
  get character() {
    return translate('common', 'galaxy.kind.character');
  },
  get universe() {
    return translate('common', 'galaxy.kind.universe');
  },
  get worldbook() {
    return translate('common', 'galaxy.kind.worldbook');
  },
  get style() {
    return translate('common', 'galaxy.kind.style');
  },
  get 'prompt-set'() {
    return translate('common', 'galaxy.kind.promptSet');
  },
};

export const galaxyKindCreateLabels: Record<GalaxyKind, string> = {
  get persona() {
    return galaxyText('create.persona');
  },
  get character() {
    return galaxyText('create.character');
  },
  get universe() {
    return galaxyText('create.universe');
  },
  get worldbook() {
    return galaxyText('create.worldbook');
  },
  get style() {
    return galaxyText('create.style');
  },
  get 'prompt-set'() {
    return galaxyText('create.promptSet');
  },
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
