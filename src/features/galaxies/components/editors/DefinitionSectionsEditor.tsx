import { Button, Input, TextArea } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { DefinitionSection } from '../../../../types';
import { createId } from '../../model';
import { EditorSection } from './EditorSection';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('galaxies');
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
          <Icon name="plus" className="size-4" />{' '}
          {t('definitionSectionsEditor.entry')}
        </Button>
      }
    >
      {sections.length === 0 ? (
        <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
          {t('definitionSectionsEditor.addTheFirstDefinitionEntry')}
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="collection-item-enter rounded-xl border border-separator bg-surface-secondary p-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-default text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <Input
                  autoComplete="off"
                  fullWidth
                  variant="secondary"
                  value={section.title}
                  placeholder={t('definitionSectionsEditor.entryTitle')}
                  aria-label={t('definitionSectionsEditor.entryTitleLabel', {
                    value1: index + 1,
                  })}
                  onChange={(event) =>
                    patch(section.id, 'title', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={t('definitionSectionsEditor.deleteEntry')}
                  onPress={() =>
                    onChange(sections.filter((item) => item.id !== section.id))
                  }
                >
                  <Icon name="trash" className="size-4 text-danger" />
                </Button>
              </div>
              <TextArea
                autoComplete="off"
                fullWidth
                variant="secondary"
                className="mt-3"
                rows={4}
                value={section.content}
                placeholder={t('definitionSectionsEditor.entryContent')}
                aria-label={t('definitionSectionsEditor.entryContentLabel', {
                  value1: index + 1,
                })}
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
