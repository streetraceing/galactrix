import { TextArea } from '@heroui/react';
import type { StyleData } from '../../../../types';
import { EditorSection } from './EditorSection';

export function StyleEditor({
  data,
  onChange,
}: {
  data: StyleData;
  onChange: (data: StyleData) => void;
}) {
  return (
    <EditorSection
      title="Инструкции стиля"
      description="Пресет можно выбрать в настройках любого персонажа."
    >
      <div className="space-y-3">
        <TextArea
          fullWidth
          variant="secondary"
          rows={6}
          value={data.instructions}
          placeholder="Длина ответов, тон, формат действий, лексика, частота эмодзи..."
          aria-label="Инструкции стиля"
          onChange={(event) =>
            onChange({ ...data, instructions: event.target.value })
          }
        />
        <TextArea
          fullWidth
          variant="secondary"
          rows={5}
          value={data.example}
          placeholder="Необязательный пример сообщения в этом стиле"
          aria-label="Пример стиля"
          onChange={(event) =>
            onChange({ ...data, example: event.target.value })
          }
        />
      </div>
    </EditorSection>
  );
}
