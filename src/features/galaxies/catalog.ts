import type { TranslationKey } from '../../i18n';
import type { GalaxyKind } from '../../types';

type GalaxySection = {
  id: GalaxyKind;
  labelKey: TranslationKey<'galaxies'>;
};

export const galaxySections = [
  { id: 'persona', labelKey: 'section.persona' },
  { id: 'character', labelKey: 'section.character' },
  { id: 'universe', labelKey: 'section.universe' },
  { id: 'worldbook', labelKey: 'section.worldbook' },
  { id: 'style', labelKey: 'section.style' },
  { id: 'prompt-set', labelKey: 'section.promptSet' },
] as const satisfies readonly GalaxySection[];

export const galaxyKindDescriptionKeys = {
  persona: 'description.persona',
  character: 'description.character',
  universe: 'description.universe',
  worldbook: 'description.worldbook',
  style: 'description.style',
  'prompt-set': 'description.promptSet',
} as const satisfies Record<GalaxyKind, TranslationKey<'galaxies'>>;

export const galaxyKindLabelKeys = {
  persona: 'galaxy.kind.persona',
  character: 'galaxy.kind.character',
  universe: 'galaxy.kind.universe',
  worldbook: 'galaxy.kind.worldbook',
  style: 'galaxy.kind.style',
  'prompt-set': 'galaxy.kind.promptSet',
} as const satisfies Record<GalaxyKind, TranslationKey<'common'>>;

export const galaxyKindCreateLabelKeys = {
  persona: 'create.persona',
  character: 'create.character',
  universe: 'create.universe',
  worldbook: 'create.worldbook',
  style: 'create.style',
  'prompt-set': 'create.promptSet',
} as const satisfies Record<GalaxyKind, TranslationKey<'galaxies'>>;

export const galaxyEditorDescriptionKeys = {
  persona: 'editor.description.persona',
  character: 'editor.description.character',
  universe: 'editor.description.universe',
  worldbook: 'editor.description.worldbook',
  style: 'editor.description.style',
  'prompt-set': 'editor.description.promptSet',
} as const satisfies Record<GalaxyKind, TranslationKey<'galaxies'>>;

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
