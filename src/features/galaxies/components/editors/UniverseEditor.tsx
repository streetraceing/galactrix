import type { UniverseData } from '../../../../types';
import { DefinitionSectionsEditor } from './DefinitionSectionsEditor';
import { useTranslation } from 'react-i18next';

export function UniverseEditor({
  data,
  onChange,
}: {
  data: UniverseData;
  onChange: (data: UniverseData) => void;
}) {
  const { t } = useTranslation('galaxies');
  return (
    <DefinitionSectionsEditor
      title={t('universeEditor.universeRulesAndFacts')}
      description={t(
        'universeEditor.describeTheWorldSPhysicsEraFactionsConstraintsAndImportant',
      )}
      sections={data.rules}
      onChange={(rules) => onChange({ ...data, rules })}
    />
  );
}
