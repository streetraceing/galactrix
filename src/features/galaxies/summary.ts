import type {
  CharacterData,
  GalaxyItem,
  PersonaData,
  PromptSetData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../types';
import { translate, type TranslationKey } from '../../i18n';
import { normalizeData, stylePresets } from './model';

function summary(
  key: TranslationKey<'galaxies'>,
  variables?: Record<string, string | number>,
) {
  return translate('galaxies', key, variables);
}

export function galaxyItemDetails(item: GalaxyItem): string[] {
  const normalized = normalizeData(item.kind, item.data);

  switch (item.kind) {
    case 'persona': {
      const data = normalized as PersonaData;
      const identity = [
        data.gender === 'unspecified' ? '' : data.gender,
        data.age,
        data.pronouns,
      ].filter(Boolean).length;
      const facts = data.attributes.length;
      return [
        identity > 0
          ? summary('summary.primaryField', { count: identity })
          : '',
        facts > 0 ? summary('summary.attribute', { count: facts }) : '',
      ].filter(Boolean);
    }
    case 'character': {
      const data = normalized as CharacterData;
      const style = stylePresets.find(
        (entry) => entry.id === data.stylePreset,
      )?.label;
      return [
        summary('summary.section', { count: data.definitionSections.length }),
        style ? summary('summary.style', { style }) : '',
      ].filter(Boolean);
    }
    case 'universe': {
      const data = normalized as UniverseData;
      return [summary('summary.ruleFact', { count: data.rules.length })];
    }
    case 'worldbook': {
      const data = normalized as WorldbookData;
      const enabled = data.entries.filter((entry) => entry.enabled).length;
      return [
        summary('summary.entry', { count: data.entries.length }),
        summary('summary.enabledEntry', { count: enabled }),
      ];
    }
    case 'style': {
      const data = normalized as StyleData;
      return [
        summary(
          data.example.trim()
            ? 'summary.hasExample'
            : 'summary.instructionsOnly',
        ),
      ];
    }
    case 'prompt-set': {
      const data = normalized as PromptSetData;
      return [
        summary('summary.rule', { count: data.presetIds.length }),
        summary('summary.block', { count: data.customBlocks.length }),
      ];
    }
  }
}
