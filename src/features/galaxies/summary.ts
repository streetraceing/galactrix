import type {
  CharacterData,
  GalaxyItem,
  PersonaData,
  StyleData,
  UniverseData,
  WorldbookData,
} from '../../types';
import { stylePresets } from './model';

export function galaxyItemDetails(item: GalaxyItem): string[] {
  switch (item.kind) {
    case 'persona': {
      const data = item.data as PersonaData;
      const identity = [data.gender, data.age, data.pronouns].filter(
        Boolean,
      ).length;
      const facts = data.attributes.length;
      return [
        identity > 0 ? `${identity} основных поля` : '',
        facts > 0 ? `${facts} доп. параметров` : '',
      ].filter(Boolean);
    }
    case 'character': {
      const data = item.data as CharacterData;
      const style = stylePresets.find(
        (entry) => entry.id === data.stylePreset,
      )?.label;
      return [
        `${data.definitionSections.length} разделов`,
        style ? `Стиль: ${style}` : '',
      ].filter(Boolean);
    }
    case 'universe': {
      const data = item.data as UniverseData;
      return [`${data.rules.length} правил и фактов`];
    }
    case 'worldbook': {
      const data = item.data as WorldbookData;
      const enabled = data.entries.filter((entry) => entry.enabled).length;
      return [`${data.entries.length} записей`, `${enabled} включено`];
    }
    case 'style': {
      const data = item.data as StyleData;
      return [data.example.trim() ? 'Есть пример' : 'Только инструкции'];
    }
  }
}
