import { Button, Input, TextArea } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { NamedValue, PersonaData } from '../../../../types';
import { createId } from '../../model';
import { EditorSection } from './EditorSection';

export function PersonaEditor({
  data,
  onChange,
}: {
  data: PersonaData;
  onChange: (data: PersonaData) => void;
}) {
  const patch = <K extends keyof PersonaData>(key: K, value: PersonaData[K]) =>
    onChange({ ...data, [key]: value });

  const patchAttribute = (
    id: string,
    key: keyof Pick<NamedValue, 'title' | 'value'>,
    value: string,
  ) =>
    patch(
      'attributes',
      data.attributes.map((attribute) =>
        attribute.id === id ? { ...attribute, [key]: value } : attribute,
      ),
    );

  return (
    <div className="space-y-4">
      <EditorSection
        title="Основные параметры"
        description="Стабильные сведения о {{user}}, которые не должны теряться между сообщениями."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            fullWidth
            variant="secondary"
            value={data.gender}
            placeholder="Гендер"
            aria-label="Гендер"
            onChange={(event) => patch('gender', event.target.value)}
          />
          <Input
            fullWidth
            variant="secondary"
            value={data.age}
            placeholder="Возраст"
            aria-label="Возраст"
            onChange={(event) => patch('age', event.target.value)}
          />
          <Input
            fullWidth
            variant="secondary"
            value={data.pronouns}
            placeholder="Местоимения"
            aria-label="Местоимения"
            onChange={(event) => patch('pronouns', event.target.value)}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Поведение и предпочтения"
        description="Факты из этих полей будут собраны в отдельный блок персоны."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea
            fullWidth
            variant="secondary"
            rows={4}
            value={data.habits}
            placeholder="Привычки и устойчивое поведение"
            aria-label="Привычки"
            onChange={(event) => patch('habits', event.target.value)}
          />
          <TextArea
            fullWidth
            variant="secondary"
            rows={4}
            value={data.preferences}
            placeholder="Предпочтения, интересы и ограничения"
            aria-label="Предпочтения"
            onChange={(event) => patch('preferences', event.target.value)}
          />
        </div>
        <TextArea
          fullWidth
          variant="secondary"
          className="mt-3"
          rows={3}
          value={data.communicationNotes}
          placeholder="Как персонаж должен общаться с пользователем"
          aria-label="Особенности общения"
          onChange={(event) => patch('communicationNotes', event.target.value)}
        />
      </EditorSection>

      <EditorSection
        title="Дополнительные параметры"
        description="Любые устойчивые факты: профессия, характер, любимые темы, ограничения и другое."
        action={
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              patch('attributes', [
                ...data.attributes,
                { id: createId(), title: '', value: '' },
              ])
            }
          >
            <Icon name="plus" className="size-4" /> Параметр
          </Button>
        }
      >
        {data.attributes.length === 0 ? (
          <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
            Дополнительных параметров пока нет.
          </p>
        ) : (
          <div className="space-y-2">
            {data.attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-separator bg-surface-secondary p-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"
              >
                <Input
                  fullWidth
                  variant="secondary"
                  className="order-1 min-w-0"
                  value={attribute.title}
                  placeholder="Параметр"
                  aria-label="Название параметра"
                  onChange={(event) =>
                    patchAttribute(attribute.id, 'title', event.target.value)
                  }
                />
                <Input
                  fullWidth
                  variant="secondary"
                  className="order-3 col-span-2 min-w-0 sm:order-2 sm:col-span-1"
                  value={attribute.value}
                  placeholder="Значение"
                  aria-label="Значение параметра"
                  onChange={(event) =>
                    patchAttribute(attribute.id, 'value', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  variant="ghost"
                  className="order-2 sm:order-3"
                  aria-label="Удалить параметр"
                  onPress={() =>
                    patch(
                      'attributes',
                      data.attributes.filter(
                        (item) => item.id !== attribute.id,
                      ),
                    )
                  }
                >
                  <Icon name="trash" className="size-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </EditorSection>
    </div>
  );
}
