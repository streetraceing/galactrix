import { Accordion, Chip } from '@heroui/react';
import type {
  GalaxyItem,
  PromptConfig,
  PromptContextPriorities,
} from '../../../../types';
import { promptPriorities } from '../../promptConfig';
import { getPromptOrderPreview } from './promptBuilderModel';
import { useTranslation } from 'react-i18next';

export function PromptOrderSection({
  value,
  includeContext = true,
  sets = [],
  inheritedSetIds = [],
  activeContextFields,
}: {
  value: PromptConfig;
  includeContext?: boolean;
  sets?: GalaxyItem[];
  inheritedSetIds?: string[];
  activeContextFields?: Array<keyof PromptContextPriorities>;
}) {
  const { t } = useTranslation('chats');
  const preview = getPromptOrderPreview(
    value,
    includeContext,
    sets,
    inheritedSetIds,
    activeContextFields,
  );

  return (
    <Accordion.Item id="preview">
      <Accordion.Heading>
        <Accordion.Trigger className="px-4 sm:px-5 outline-none! border-none! ring-transparent! ring-0! ring-offset-0">
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">
              {t('promptOrderSection.assemblyOrder')}
            </strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              {t(
                'promptOrderSection.connectedSourcesAreOrderedFromBackgroundToMostImportant',
              )}
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-4 pb-5 sm:px-5">
          {preview.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {preview.map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex min-w-0 flex-col items-stretch gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-default text-xs tabular-nums text-muted">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block wrap-break-word text-sm font-medium">
                        {entry.title}
                      </strong>
                      <span className="mt-0.5 block wrap-break-word text-xs leading-5 text-muted">
                        {entry.description}
                      </span>
                    </span>
                  </span>
                  <Chip
                    size="sm"
                    variant="soft"
                    className="self-start sm:shrink-0"
                  >
                    {t(
                      promptPriorities.find(
                        (priority) => priority.id === entry.priority,
                      )?.labelKey ?? 'priority.normal.label',
                    )}
                  </Chip>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted text-center">
              {t(
                'promptOrderSection.thereAreNoActiveSourcesYetSelectRulesAPrompt',
              )}
            </p>
          )}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
