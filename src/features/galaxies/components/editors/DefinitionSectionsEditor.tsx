import { Button, Input, TextArea } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { DefinitionSection } from '../../../../types';
import { createId } from '../../model';
import { EditorSection } from './EditorSection';

export function DefinitionSectionsEditor({
  title,
  description,
  sections,
  onChange,
}: {
  title: string;
  description: string;
  sections: DefinitionSection[];
  onChange: (sections: DefinitionSection[]) => void;
}) {
  const patch = (
    id: string,
    key: keyof Pick<DefinitionSection, 'title' | 'content'>,
    value: string,
  ) =>
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, [key]: value } : section,
      ),
    );

  return (
    <EditorSection
      title={title}
      description={description}
      action={
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            onChange([...sections, { id: createId(), title: '', content: '' }])
          }
        >
          <Icon name="plus" className="size-4" /> Запись
        </Button>
      }
    >
      {sections.length === 0 ? (
        <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
          Добавьте первую запись определения.
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="rounded-xl border border-separator bg-surface-secondary p-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-default text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <Input
                  fullWidth
                  variant="secondary"
                  value={section.title}
                  placeholder="Заголовок записи"
                  aria-label={`Заголовок записи ${index + 1}`}
                  onChange={(event) =>
                    patch(section.id, 'title', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Удалить запись"
                  onPress={() =>
                    onChange(sections.filter((item) => item.id !== section.id))
                  }
                >
                  <Icon name="trash" className="size-4 text-danger" />
                </Button>
              </div>
              <TextArea
                fullWidth
                variant="secondary"
                className="mt-3"
                rows={4}
                value={section.content}
                placeholder="Содержимое записи"
                aria-label={`Содержимое записи ${index + 1}`}
                onChange={(event) =>
                  patch(section.id, 'content', event.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}
    </EditorSection>
  );
}
