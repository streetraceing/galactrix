import {
  Accordion,
  Button,
  Checkbox,
  CheckboxGroup,
  Label,
  ListBox,
  Select,
} from '@heroui/react';
import { Icon } from '../../../../components/Icon';
import type { PromptConfig, PromptPresetId } from '../../../../types';
import {
  matchingPromptBundleId,
  promptBundles,
  promptPresets,
} from '../../promptConfig';
import { useTranslation } from 'react-i18next';

export function PromptRulesSection({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  const { t } = useTranslation('chats');
  const activeBundleId = matchingPromptBundleId(value.presetIds);
  const bundlePlaceholder = value.presetIds.length
    ? t('promptRulesSection.customSelection', {
        count: value.presetIds.length,
      })
    : t('promptRulesSection.chooseBuiltInSet');

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
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Select
              fullWidth
              variant="secondary"
              value={activeBundleId}
              placeholder={bundlePlaceholder}
              onChange={(key) => {
                const selectedId = Array.isArray(key) ? key[0] : key;
                if (selectedId == null) return;
                const bundle = promptBundles.find(
                  (candidate) => candidate.id === String(selectedId),
                );
                if (!bundle) return;
                onChange({
                  ...value,
                  presetIds: [...bundle.presetIds],
                });
              }}
            >
              <Label>{t('promptRulesSection.builtInSets')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {promptBundles.map((bundle) => (
                    <ListBox.Item
                      key={bundle.id}
                      id={bundle.id}
                      textValue={t(bundle.labelKey)}
                    >
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm">
                          {t(bundle.labelKey)}
                        </strong>
                        <span className="mt-0.5 block text-xs leading-5 text-muted">
                          {t(bundle.descriptionKey)}
                        </span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {value.presetIds.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="sm:mb-0.5"
                onPress={() => onChange({ ...value, presetIds: [] })}
              >
                <Icon name="close" className="size-4" />
                {t('promptRulesSection.resetRules')}
              </Button>
            ) : null}
          </div>

          <p className="mb-3 text-xs leading-5 text-muted">
            {t('promptRulesSection.builtInSetDescription')}
          </p>

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
                className="m-0 w-full rounded-xl border border-separator bg-surface transition-colors data-[selected=true]:border-accent/40 data-[selected=true]:bg-accent/5"
              >
                <Checkbox.Content className="w-full items-start px-3 py-3">
                  <Checkbox.Control className="mt-0.5">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="min-w-0">
                    <strong className="block text-sm">
                      {t(preset.labelKey)}
                    </strong>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {t(preset.descriptionKey)}
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
