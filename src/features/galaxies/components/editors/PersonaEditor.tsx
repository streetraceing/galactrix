import { Button, Input, Label, ListBox, Select, TextArea } from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../../components/Icon';
import type { NamedValue, PersonaData } from '../../../../types';
import { createId, pronounsForGender } from '../../model';
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
          <div className="flex flex-col gap-1.5">
            <Label>Гендер</Label>
            <Select
              fullWidth
              variant="secondary"
              value={data.gender}
              aria-label="Гендер"
              onChange={(key: Key | Key[] | null) => {
                if (key == null || Array.isArray(key)) return;
                const gender = String(key) as PersonaData['gender'];
                onChange({
                  ...data,
                  gender,
                  pronouns: pronounsForGender(gender),
                });
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="male" textValue="Мужской">
                    Мужской
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="female" textValue="Женский">
                    Женский
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="unspecified" textValue="Не указан">
                    Не указан
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="persona-age">Возраст</Label>
            <Input
              id="persona-age"
              fullWidth
              variant="secondary"
              value={data.age}
              placeholder="Например, 25"
              autoComplete="off"
              onChange={(event) => patch('age', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="persona-pronouns">Местоимения</Label>
            <Input
              id="persona-pronouns"
              fullWidth
              variant="secondary"
              value={data.pronouns}
              placeholder="Зависят от гендера"
              readOnly
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Поведение и предпочтения"
        description="Факты из этих полей будут собраны в отдельный блок персоны."
      >
        <TextArea
          fullWidth
          variant="secondary"
          rows={4}
          value={data.habits}
          placeholder="Привычки и устойчивое поведение"
          aria-label="Привычки"
          autoComplete="off"
          onChange={(event) => patch('habits', event.target.value)}
        />
        <TextArea
          fullWidth
          variant="secondary"
          rows={4}
          value={data.preferences}
          placeholder="Предпочтения, интересы и ограничения"
          aria-label="Предпочтения"
          autoComplete="off"
          onChange={(event) => patch('preferences', event.target.value)}
        />
        <TextArea
          fullWidth
          variant="secondary"
          rows={3}
          value={data.communicationNotes}
          placeholder="Как персонаж должен общаться с пользователем"
          aria-label="Особенности общения"
          autoComplete="off"
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
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-separator sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"
              >
                <Input
                  fullWidth
                  variant="secondary"
                  className="order-1 min-w-0"
                  value={attribute.title}
                  placeholder="Параметр"
                  aria-label="Название параметра"
                  autoComplete="off"
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
                  autoComplete="off"
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
