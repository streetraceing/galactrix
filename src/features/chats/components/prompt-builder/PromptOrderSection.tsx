import { Accordion, Chip } from '@heroui/react';
import type { PromptConfig } from '../../../../types';
import { promptPriorities } from '../../promptConfig';
import { getPromptOrderPreview } from './promptBuilderModel';

export function PromptOrderSection({
  value,
  includeContext = true,
}: {
  value: PromptConfig;
  includeContext?: boolean;
}) {
  const preview = getPromptOrderPreview(value, includeContext);

  return (
    <Accordion.Item id="preview">
      <Accordion.Heading>
        <Accordion.Trigger className="px-4 sm:px-5">
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">Схема сборки</strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              Подключённые источники идут от фоновых к самым важным
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-4 pb-5 sm:px-5">
          <ol className="grid gap-2 sm:grid-cols-2">
            {preview.map((entry, index) => (
              <li
                key={entry.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-separator bg-surface px-3 py-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-default text-xs tabular-nums text-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.title}
                </span>
                <Chip size="sm" variant="soft">
                  {
                    promptPriorities.find(
                      (priority) => priority.id === entry.priority,
                    )?.label
                  }
                </Chip>
              </li>
            ))}
          </ol>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
