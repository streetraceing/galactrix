import type {
  CharacterData,
  GalaxyItem,
  PersonaData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../types';
import { countRu } from '../../lib/plural';
import { normalizeData, stylePresets } from './model';

export function galaxyItemDetails(item: GalaxyItem): string[] {
  const normalized = normalizeData(item.kind, item.data);

  switch (item.kind) {
    case 'persona': {
      const data = normalized as PersonaData;
      const identity = [data.gender, data.age, data.pronouns].filter(
        Boolean,
      ).length;
      const facts = data.attributes.length;
      return [
        identity > 0
          ? countRu(identity, [
              'основное поле',
              'основных поля',
              'основных полей',
            ])
          : '',
        facts > 0
          ? countRu(facts, [
              'доп. параметр',
              'доп. параметра',
              'доп. параметров',
            ])
          : '',
      ].filter(Boolean);
    }
    case 'character': {
      const data = normalized as CharacterData;
      const style = stylePresets.find(
        (entry) => entry.id === data.stylePreset,
      )?.label;
      return [
        countRu(data.definitionSections.length, [
          'раздел',
          'раздела',
          'разделов',
        ]),
        style ? `Стиль: ${style}` : '',
      ].filter(Boolean);
    }
    case 'universe': {
      const data = normalized as UniverseData;
      return [
        countRu(data.rules.length, [
          'правило или факт',
          'правила или факта',
          'правил и фактов',
        ]),
      ];
    }
    case 'worldbook': {
      const data = normalized as WorldbookData;
      const enabled = data.entries.filter((entry) => entry.enabled).length;
      return [
        countRu(data.entries.length, ['запись', 'записи', 'записей']),
        countRu(enabled, [
          'запись включена',
          'записи включены',
          'записей включено',
        ]),
      ];
    }
    case 'style': {
      const data = normalized as StyleData;
      return [data.example.trim() ? 'Есть пример' : 'Только инструкции'];
    }
  }
}
