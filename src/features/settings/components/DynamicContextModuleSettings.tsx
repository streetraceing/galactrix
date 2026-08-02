import { Label, ListBox, Select } from '@heroui/react';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  DynamicContextMode,
  DynamicContextSettings,
  Provider,
} from '../../../types';
import {
  ModuleNumberField,
  ModuleProviderSelect,
  ModuleSettingsCard,
} from './ModuleFields';

export function DynamicContextModuleSettings({
  value,
  providers,
  onChange,
}: {
  value: DynamicContextSettings;
  providers: Provider[];
  onChange: (value: DynamicContextSettings) => void;
}) {
  const { t } = useTranslation('settings');
  const [promptDraft, setPromptDraft] = useState(value.analysisPrompt);
  useEffect(() => setPromptDraft(value.analysisPrompt), [value.analysisPrompt]);
  const patch = <K extends keyof DynamicContextSettings>(
    key: K,
    next: DynamicContextSettings[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <ModuleSettingsCard
      moduleId="dynamicContext"
      icon="brain"
      title={t('ai.dynamic.title')}
      description={t('ai.dynamic.description')}
      enabledLabel={t('ai.dynamic.enabled')}
      enabledDescription={t('ai.dynamic.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <div className="min-w-0 py-3">
        <Label>{t('ai.dynamic.mode')}</Label>
        <p className="mt-1 text-xs leading-5 text-muted">
          {t('ai.dynamic.modeDescription')}
        </p>
        <Select
          className="mt-2 min-w-0 max-w-full"
          fullWidth
          variant="secondary"
          value={value.mode}
          aria-label={t('ai.dynamic.mode')}
          onChange={(key: Key | Key[] | null) => {
            if (key === 'local' || key === 'provider' || key === 'hybrid') {
              patch('mode', key as DynamicContextMode);
            }
          }}
        >
          <Select.Trigger className="w-full min-w-0 max-w-full">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {(['local', 'provider', 'hybrid'] as const).map((mode) => (
                <ListBox.Item
                  id={mode}
                  key={mode}
                  textValue={t(`ai.dynamic.mode_${mode}`)}
                >
                  <div>
                    <strong className="block text-sm">
                      {t(`ai.dynamic.mode_${mode}`)}
                    </strong>
                    <span className="text-xs text-muted">
                      {t(`ai.dynamic.mode_${mode}Description`)}
                    </span>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      {value.mode !== 'local' ? (
        <ModuleProviderSelect
          label={t('ai.dynamic.provider')}
          description={t('ai.dynamic.providerDescription')}
          value={value.providerId}
          providers={providers}
          automaticLabel={t('ai.dynamic.currentChatProvider')}
          onChange={(providerId) => patch('providerId', providerId)}
        />
      ) : null}
      <ModuleNumberField
        label={t('ai.dynamic.directMessages')}
        description={t('ai.dynamic.directMessagesDescription')}
        value={value.directMessageLimit}
        min={8}
        max={200}
        onChange={(next) => patch('directMessageLimit', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.dynamic.triggerMessages')}
        description={t('ai.dynamic.triggerMessagesDescription')}
        value={value.triggerMessages}
        min={12}
        max={500}
        onChange={(next) => patch('triggerMessages', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.dynamic.batchSize')}
        description={t('ai.dynamic.batchSizeDescription')}
        value={value.summaryBatchSize}
        min={4}
        max={100}
        onChange={(next) => patch('summaryBatchSize', Math.round(next))}
      />
      {value.mode !== 'local' ? (
        <div className="min-w-0 py-3">
          <Label>{t('ai.dynamic.analysisPrompt')}</Label>
          <p className="mt-1 text-xs leading-5 text-muted">
            {t('ai.dynamic.analysisPromptDescription')}
          </p>
          <textarea
            className="mt-2 min-h-40 w-full min-w-0 resize-y rounded-xl border border-separator bg-surface-secondary px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-accent"
            value={promptDraft}
            maxLength={12000}
            onChange={(event) => setPromptDraft(event.target.value)}
            onBlur={() => {
              const next = promptDraft.trim();
              if (next && next !== value.analysisPrompt) {
                patch('analysisPrompt', next);
              }
            }}
          />
        </div>
      ) : null}
    </ModuleSettingsCard>
  );
}
