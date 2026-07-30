import { Accordion, Chip, Label, Surface } from '@heroui/react';
import { Icon } from '../../../components/Icon';
import type {
  GalaxyItem,
  PromptConfig,
  PromptContextPriorities,
} from '../../../types';
import { PromptCustomBlocksSection } from './prompt-builder/PromptCustomBlocksSection';
import { PromptOrderSection } from './prompt-builder/PromptOrderSection';
import { PromptPrioritiesSection } from './prompt-builder/PromptPrioritiesSection';
import { PromptPrioritySelect } from './prompt-builder/PromptPrioritySelect';
import { PromptRulesSection } from './prompt-builder/PromptRulesSection';
import { PromptSetsField } from './prompt-builder/PromptSetsField';
import { useTranslation } from 'react-i18next';

export function PromptBuilder({
  value,
  onChange,
  sets = [],
  inheritedSetIds = [],
  activeContextFields,
  mode = 'chat',
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
  sets?: GalaxyItem[];
  inheritedSetIds?: string[];
  activeContextFields?: Array<keyof PromptContextPriorities>;
  mode?: 'chat' | 'set';
}) {
  const { t } = useTranslation('chats');
  return (
    <Surface className="min-w-0 overflow-hidden rounded-2xl border border-separator bg-surface-secondary/50">
      <div className="flex min-w-0 flex-col items-stretch gap-3 border-b border-separator p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="sparkles" className="size-4" />
            </span>
            <h3 className="text-sm font-semibold">
              {t('promptBuilder.promptBuilder')}
            </h3>
          </div>
          <p className="mt-2 max-w-2xl wrap-break-word text-xs leading-5 text-muted">
            {t(
              'promptBuilder.combineRulesAdjustSourceImportanceAndAddCustomInstructionsReorder',
            )}
          </p>
        </div>
        <span className="self-start">
          <Chip size="sm" variant="soft" color="accent">
            {t('count.rule', { count: value.presetIds.length })}
          </Chip>
        </span>
      </div>

      {mode === 'chat' && sets.length > 0 ? (
        <PromptSetsField
          sets={sets}
          value={value.setIds ?? []}
          onChange={(setIds) => onChange({ ...value, setIds })}
        />
      ) : null}
      {mode === 'set' ? (
        <div className="grid gap-3 border-b border-separator px-4 py-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:px-5">
          <span className="min-w-0">
            <Label>{t('promptBuilder.builtInRulePriority')}</Label>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              {t('promptBuilder.customBlocksBelowHaveTheirOwnPriority')}
            </span>
          </span>
          <PromptPrioritySelect
            value={value.contextPriorities.presets}
            label={t('promptBuilder.promptSetBuiltInRulePriority')}
            onChange={(presets) =>
              onChange({
                ...value,
                contextPriorities: {
                  ...value.contextPriorities,
                  presets,
                },
              })
            }
          />
        </div>
      ) : null}

      <Accordion
        allowsMultipleExpanded
        defaultExpandedKeys={
          mode === 'chat' ? ['rules', 'priorities'] : ['rules', 'custom']
        }
        hideSeparator
        className="w-full"
      >
        <PromptRulesSection value={value} onChange={onChange} />
        {mode === 'chat' ? (
          <PromptPrioritiesSection value={value} onChange={onChange} />
        ) : null}
        <PromptCustomBlocksSection value={value} onChange={onChange} />
        <PromptOrderSection
          value={value}
          includeContext={mode === 'chat'}
          sets={sets}
          inheritedSetIds={inheritedSetIds}
          activeContextFields={activeContextFields}
        />
      </Accordion>
    </Surface>
  );
}
