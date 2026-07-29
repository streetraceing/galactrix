import { Accordion } from '@heroui/react';
import type { PromptConfig } from '../../../../types';
import { priorityFields } from './promptBuilderModel';
import { PromptPrioritySelect } from './PromptPrioritySelect';

export function PromptPrioritiesSection({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  return (
    <Accordion.Item id="priorities">
      <Accordion.Heading>
        <Accordion.Trigger className="px-4 sm:px-5">
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">Приоритеты источников</strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              Управляют порядком и силой частей системного промпта
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="grid gap-3 px-4 pb-5 sm:grid-cols-2 sm:px-5">
          {priorityFields.map((field) => (
            <div
              key={field.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 rounded-xl border border-separator bg-surface p-3"
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm">
                  {field.label}
                </strong>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {field.description}
                </span>
              </span>
              <PromptPrioritySelect
                value={value.contextPriorities[field.id]}
                label={`Приоритет: ${field.label}`}
                onChange={(priority) =>
                  onChange({
                    ...value,
                    contextPriorities: {
                      ...value.contextPriorities,
                      [field.id]: priority,
                    },
                  })
                }
              />
            </div>
          ))}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
