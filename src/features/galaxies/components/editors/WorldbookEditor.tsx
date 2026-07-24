import { Button, Checkbox, Input, TextArea } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { WorldbookData, WorldbookEntry } from '../../../../types';
import { createId } from '../../model';
import { EditorSection } from './EditorSection';

export function WorldbookEditor({
  data,
  onChange,
}: {
  data: WorldbookData;
  onChange: (data: WorldbookData) => void;
}) {
  const patchEntry = <K extends keyof WorldbookEntry>(
    id: string,
    key: K,
    value: WorldbookEntry[K],
  ) =>
    onChange({
      ...data,
      entries: data.entries.map((entry) =>
        entry.id === id ? { ...entry, [key]: value } : entry,
      ),
    });

  return (
    <EditorSection
      title="Записи ворлдбука"
      description="Включённые записи передаются модели вместе с остальным контекстом чата."
      action={
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            onChange({
              ...data,
              entries: [
                ...data.entries,
                {
                  id: createId(),
                  title: '',
                  keywords: '',
                  content: '',
                  enabled: true,
                },
              ],
            })
          }
        >
          <Icon name="plus" className="size-4" /> Запись
        </Button>
      }
    >
      {data.entries.length === 0 ? (
        <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
          Добавьте первую запись ворлдбука.
        </p>
      ) : (
        <div className="space-y-3">
          {data.entries.map((entry, index) => (
            <div
              key={entry.id}
              className="space-y-3 rounded-xl border border-separator bg-surface-secondary p-3"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  isSelected={entry.enabled}
                  aria-label={`Включить запись ${index + 1}`}
                  onChange={(enabled) =>
                    patchEntry(entry.id, 'enabled', enabled)
                  }
                />
                <Input
                  fullWidth
                  variant="secondary"
                  value={entry.title}
                  placeholder="Название записи"
                  aria-label={`Название записи ${index + 1}`}
                  onChange={(event) =>
                    patchEntry(entry.id, 'title', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Удалить запись"
                  onPress={() =>
                    onChange({
                      ...data,
                      entries: data.entries.filter(
                        (item) => item.id !== entry.id,
                      ),
                    })
                  }
                >
                  <Icon name="trash" className="size-4 text-danger" />
                </Button>
              </div>
              <Input
                fullWidth
                variant="secondary"
                value={entry.keywords}
                placeholder="Ключевые слова через запятую"
                aria-label={`Ключевые слова записи ${index + 1}`}
                onChange={(event) =>
                  patchEntry(entry.id, 'keywords', event.target.value)
                }
              />
              <TextArea
                fullWidth
                variant="secondary"
                rows={5}
                value={entry.content}
                placeholder="Содержимое записи"
                aria-label={`Содержимое записи ${index + 1}`}
                onChange={(event) =>
                  patchEntry(entry.id, 'content', event.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}
    </EditorSection>
  );
}
