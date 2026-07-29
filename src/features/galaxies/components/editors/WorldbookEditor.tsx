import { Button, Checkbox, Input, TextArea } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { WorldbookData, WorldbookEntry } from '../../../../types';
import { createId } from '../../model';
import { EditorSection } from './EditorSection';
import { useTranslation } from 'react-i18next';

export function WorldbookEditor({
  data,
  onChange,
}: {
  data: WorldbookData;
  onChange: (data: WorldbookData) => void;
}) {
  const { t } = useTranslation('galaxies');
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
      title={t('worldbookEditor.worldbookEntries')}
      description={t(
        'worldbookEditor.enabledEntriesAreSentToTheModelWithTheRest',
      )}
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
          <Icon name="plus" className="size-4" />{' '}
          {t('definitionSectionsEditor.entry')}
        </Button>
      }
    >
      {data.entries.length === 0 ? (
        <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
          {t('worldbookEditor.addTheFirstWorldbookEntry')}
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
                  aria-label={t('worldbookEditor.enableEntryLabel', {
                    value1: index + 1,
                  })}
                  onChange={(enabled) =>
                    patchEntry(entry.id, 'enabled', enabled)
                  }
                />
                <Input
                  autoComplete="off"
                  fullWidth
                  variant="secondary"
                  value={entry.title}
                  placeholder={t('worldbookEditor.entryName')}
                  aria-label={t('worldbookEditor.entryNameLabel', {
                    value1: index + 1,
                  })}
                  onChange={(event) =>
                    patchEntry(entry.id, 'title', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={t('definitionSectionsEditor.deleteEntry')}
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
                autoComplete="off"
                fullWidth
                variant="secondary"
                value={entry.keywords}
                placeholder={t('worldbookEditor.commaSeparatedKeywords')}
                aria-label={t('worldbookEditor.entryKeywordsLabel', {
                  value1: index + 1,
                })}
                onChange={(event) =>
                  patchEntry(entry.id, 'keywords', event.target.value)
                }
              />
              <TextArea
                autoComplete="off"
                fullWidth
                variant="secondary"
                rows={5}
                value={entry.content}
                placeholder={t('definitionSectionsEditor.entryContent')}
                aria-label={t('definitionSectionsEditor.entryContentLabel', {
                  value1: index + 1,
                })}
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
