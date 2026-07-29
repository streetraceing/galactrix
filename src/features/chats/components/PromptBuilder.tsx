import { Accordion, Chip, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import { countRu } from '../../../lib/plural';
import type { PromptConfig } from '../../../types';
import { PromptCustomBlocksSection } from './prompt-builder/PromptCustomBlocksSection';
import { PromptOrderSection } from './prompt-builder/PromptOrderSection';
import { PromptPrioritiesSection } from './prompt-builder/PromptPrioritiesSection';
import { PromptRulesSection } from './prompt-builder/PromptRulesSection';

export function PromptBuilder({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  return (
    <Surface className="min-w-0 overflow-hidden rounded-2xl border border-separator bg-surface-secondary/50">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-separator p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="sparkles" className="size-4" />
            </span>
            <h3 className="text-sm font-semibold">Конструктор промпта</h3>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            Совмещайте правила, меняйте важность источников и добавляйте свои
            инструкции. При конфликте более высокий приоритет побеждает.
          </p>
        </div>
        <Chip size="sm" variant="soft" color="accent">
          {countRu(value.presetIds.length, ['правило', 'правила', 'правил'])}
        </Chip>
      </div>

      <Accordion
        allowsMultipleExpanded
        defaultExpandedKeys={['rules']}
        hideSeparator
        className="w-full"
      >
        <PromptRulesSection value={value} onChange={onChange} />
        <PromptPrioritiesSection value={value} onChange={onChange} />
        <PromptCustomBlocksSection value={value} onChange={onChange} />
        <PromptOrderSection value={value} />
      </Accordion>
    </Surface>
  );
}
