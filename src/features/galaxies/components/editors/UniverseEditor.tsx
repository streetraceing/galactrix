import type { UniverseData } from '../../../../types';
import { DefinitionSectionsEditor } from './DefinitionSectionsEditor';

export function UniverseEditor({
  data,
  onChange,
}: {
  data: UniverseData;
  onChange: (data: UniverseData) => void;
}) {
  return (
    <DefinitionSectionsEditor
      title="Правила и факты вселенной"
      description="Опишите физику мира, эпоху, фракции, ограничения и важные правила."
      sections={data.rules}
      onChange={(rules) => onChange({ ...data, rules })}
    />
  );
}
