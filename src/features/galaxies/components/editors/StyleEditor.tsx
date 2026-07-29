import { TextArea } from '@heroui/react';
import type { StyleData } from '../../../../types';
import { EditorSection } from './EditorSection';
import { useTranslation } from 'react-i18next';

export function StyleEditor({
  data,
  onChange,
}: {
  data: StyleData;
  onChange: (data: StyleData) => void;
}) {
  const { t } = useTranslation('galaxies');
  return (
    <EditorSection
      title={t('styleEditor.styleInstructions')}
      description={t(
        'styleEditor.thePresetCanBeSelectedInAnyCharacterSSettings',
      )}
    >
      <div className="space-y-3">
        <TextArea
          autoComplete="off"
          fullWidth
          variant="secondary"
          rows={6}
          value={data.instructions}
          placeholder={t(
            'styleEditor.responseLengthToneActionFormatVocabularyEmojiFrequency',
          )}
          aria-label={t('styleEditor.styleInstructions')}
          onChange={(event) =>
            onChange({ ...data, instructions: event.target.value })
          }
        />
        <TextArea
          autoComplete="off"
          fullWidth
          variant="secondary"
          rows={5}
          value={data.example}
          placeholder={t('styleEditor.optionalExampleMessageInThisStyle')}
          aria-label={t('styleEditor.styleExample')}
          onChange={(event) =>
            onChange({ ...data, example: event.target.value })
          }
        />
      </div>
    </EditorSection>
  );
}
