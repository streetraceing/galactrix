import { Accordion, Button, Checkbox, CheckboxGroup } from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { PromptConfig, PromptPresetId } from '../../../../types';
import { promptPresets } from '../../promptConfig';
import { livingDialogueBundle } from './promptBuilderModel';
import { useTranslation } from 'react-i18next';

export function PromptRulesSection({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  const { t } = useTranslation('chats');
  return (
    <Accordion.Item id="rules">
      <Accordion.Heading>
        <Accordion.Trigger className="px-4 sm:px-5">
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">
              {t('promptRulesSection.responseRules')}
            </strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              {t('promptRulesSection.youCanSelectMultipleCompatibleRules')}
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-4 pb-5 sm:px-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                onChange({
                  ...value,
                  presetIds: [...livingDialogueBundle],
                })
              }
            >
              <Icon name="sparkles" className="size-4" />
              {t('promptRulesSection.naturalDialogueSet')}
            </Button>
            {value.presetIds.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => onChange({ ...value, presetIds: [] })}
              >
                {t('promptRulesSection.resetRules')}
              </Button>
            ) : null}
          </div>

          <CheckboxGroup
            aria-label={t('promptRulesSection.responseRules')}
            value={value.presetIds}
            onChange={(presetIds) =>
              onChange({
                ...value,
                presetIds: presetIds as PromptPresetId[],
              })
            }
            className="flex flex-col gap-2"
            name="prompt-rules"
          >
            {promptPresets.map((preset) => (
              <Checkbox
                key={preset.id}
                value={preset.id}
                variant="secondary"
                className="w-full rounded-xl border border-separator bg-surface transition-colors data-[selected=true]:border-accent/40 data-[selected=true]:bg-accent/5 m-0"
              >
                <Checkbox.Content className="w-full items-start px-3 py-3">
                  <Checkbox.Control className="mt-0.5">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="min-w-0">
                    <strong className="block text-sm">{preset.label}</strong>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {preset.description}
                    </span>
                  </span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
