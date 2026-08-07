import { useTranslation } from 'react-i18next';
import type { ContextBudgetSettings } from '../../../types';
import { ModuleNumberField, ModuleSettingsCard } from './ModuleFields';

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
