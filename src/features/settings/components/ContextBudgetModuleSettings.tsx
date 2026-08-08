import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { ContextBudgetSettings } from '../../../types';
import { SettingSwitchRow } from '../../profile/components/SettingSwitchRow';
import { ModuleNumberField, ModuleSettingsCard } from './ModuleFields';

type SavingsPreset = Pick<
  ContextBudgetSettings,
  | 'maxCharacters'
  | 'preserveRecentMessages'
  | 'worldbookScanMessages'
  | 'maxWorldbookEntries'
  | 'maxSystemCharacters'
>;

const SAVINGS_PRESETS: Record<
  'balanced' | 'aggressive' | 'extreme',
  SavingsPreset
> = {
  balanced: {
    maxCharacters: 32_000,
    preserveRecentMessages: 10,
    worldbookScanMessages: 8,
    maxWorldbookEntries: 12,
    maxSystemCharacters: 20_000,
  },
  aggressive: {
    maxCharacters: 18_000,
    preserveRecentMessages: 8,
    worldbookScanMessages: 6,
    maxWorldbookEntries: 8,
    maxSystemCharacters: 12_000,
  },
  extreme: {
    maxCharacters: 10_000,
    preserveRecentMessages: 6,
    worldbookScanMessages: 4,
    maxWorldbookEntries: 5,
    maxSystemCharacters: 8_000,
  },
};

export function ContextBudgetModuleSettings({
  value,
  onChange,
}: {
  value: ContextBudgetSettings;
  onChange: (value: ContextBudgetSettings) => void;
}) {
  const { t } = useTranslation('settings');
  const patch = <K extends keyof ContextBudgetSettings>(
    key: K,
    next: ContextBudgetSettings[K],
  ) => onChange({ ...value, [key]: next });
  const applyPreset = (preset: SavingsPreset) =>
    onChange({
      ...value,
      ...preset,
      enabled: true,
      compactSystemPrompt: true,
      selectiveWorldbookEntries: true,
    });

  return (
    <ModuleSettingsCard
      moduleId="contextBudget"
      icon="database"
      title={t('ai.contextBudget.title')}
      description={t('ai.contextBudget.description')}
      enabledLabel={t('ai.contextBudget.enabled')}
      enabledDescription={t('ai.contextBudget.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <div className="py-3 first:pt-0">
        <p className="rounded-xl border border-separator bg-default/40 px-3 py-2 text-xs leading-5 text-muted">
          {t('ai.contextBudget.alwaysOnSavings')}
        </p>
        <strong className="mt-3 block text-sm font-medium">
          {t('ai.contextBudget.presets')}
        </strong>
        <p className="mt-1 text-xs leading-5 text-muted">
          {t('ai.contextBudget.presetsDescription')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => applyPreset(SAVINGS_PRESETS.balanced)}
          >
            {t('ai.contextBudget.presetBalanced')}
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => applyPreset(SAVINGS_PRESETS.aggressive)}
          >
            {t('ai.contextBudget.presetAggressive')}
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => applyPreset(SAVINGS_PRESETS.extreme)}
          >
            {t('ai.contextBudget.presetExtreme')}
          </Button>
        </div>
      </div>

      <SettingSwitchRow
        label={t('ai.contextBudget.compactSystemPrompt')}
        description={t('ai.contextBudget.compactSystemPromptDescription')}
        value={value.compactSystemPrompt}
        onChange={(next) => patch('compactSystemPrompt', next)}
      />
      <SettingSwitchRow
        label={t('ai.contextBudget.selectiveWorldbookEntries')}
        description={t('ai.contextBudget.selectiveWorldbookEntriesDescription')}
        value={value.selectiveWorldbookEntries}
        onChange={(next) => patch('selectiveWorldbookEntries', next)}
      />
      <ModuleNumberField
        label={t('ai.contextBudget.worldbookScanMessages')}
        description={t('ai.contextBudget.worldbookScanMessagesDescription')}
        value={value.worldbookScanMessages}
        min={1}
        max={50}
        onChange={(next) => patch('worldbookScanMessages', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.contextBudget.maxWorldbookEntries')}
        description={t('ai.contextBudget.maxWorldbookEntriesDescription')}
        value={value.maxWorldbookEntries}
        min={1}
        max={100}
        onChange={(next) => patch('maxWorldbookEntries', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.contextBudget.maxSystemCharacters')}
        description={t('ai.contextBudget.maxSystemCharactersDescription')}
        value={value.maxSystemCharacters}
        min={4000}
        max={200000}
        step={1000}
        onChange={(next) => patch('maxSystemCharacters', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.contextBudget.maxCharacters')}
        description={t('ai.contextBudget.maxCharactersDescription')}
        value={value.maxCharacters}
        min={4000}
        max={500000}
        step={1000}
        onChange={(next) => patch('maxCharacters', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.contextBudget.preserveRecentMessages')}
        description={t('ai.contextBudget.preserveRecentMessagesDescription')}
        value={value.preserveRecentMessages}
        min={2}
        max={100}
        onChange={(next) => patch('preserveRecentMessages', Math.round(next))}
      />
    </ModuleSettingsCard>
  );
}
