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
            <div className="overflow-hidden rounded-2xl border border-separator bg-surface-secondary/35">
              <div className="flex items-center gap-3 border-b border-separator px-3 py-2.5 sm:px-4">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {t('promptOrderSection.background')}
                </span>
                <span className="relative h-px min-w-8 flex-1 bg-separator">
                  <span className="absolute -right-0.5 -top-1 size-2 rotate-45 border-r border-t border-muted" />
                </span>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {t('promptOrderSection.mostImportant')}
                </span>
                <Chip size="sm" variant="soft" className="ml-1 shrink-0">
                  {preview.length}
                </Chip>
              </div>
              <ol className="divide-y divide-separator">
                {preview.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="group grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3 py-3 transition-colors hover:bg-default/40 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-4"
                  >
                    <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-sm font-semibold tabular-nums text-accent">
                      {index + 1}
                      {index < preview.length - 1 ? (
                        <span className="absolute left-1/2 top-full hidden h-3 -translate-x-1/2 border-l border-dashed border-separator sm:block" />
                      ) : null}
                    </span>
                    <span className="min-w-0 self-center">
                      <strong className="block wrap-break-word text-sm font-semibold">
                        {entry.title}
                      </strong>
                      <span className="mt-0.5 block max-w-3xl wrap-break-word text-xs leading-5 text-muted">
                        {entry.description}
                      </span>
                    </span>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        entry.priority === 'critical' ? 'accent' : 'default'
                      }
                      className="col-start-2 w-fit sm:col-start-3 sm:row-start-1 sm:shrink-0"
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
            </div>
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
