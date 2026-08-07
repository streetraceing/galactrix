import { useTranslation } from 'react-i18next';
import type { RepetitionGuardSettings } from '../../../types';
import { ModuleNumberField, ModuleSettingsCard } from './ModuleFields';

export function RepetitionGuardModuleSettings({
  value,
  onChange,
}: {
  value: RepetitionGuardSettings;
  onChange: (value: RepetitionGuardSettings) => void;
}) {
  const { t } = useTranslation('settings');
  const patch = <K extends keyof RepetitionGuardSettings>(
    key: K,
    next: RepetitionGuardSettings[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <ModuleSettingsCard
      moduleId="repetitionGuard"
      icon="refresh"
      title={t('ai.repetitionGuard.title')}
      description={t('ai.repetitionGuard.description')}
      enabledLabel={t('ai.repetitionGuard.enabled')}
      enabledDescription={t('ai.repetitionGuard.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <ModuleNumberField
        label={t('ai.repetitionGuard.recentAssistantMessages')}
        description={t('ai.repetitionGuard.recentAssistantMessagesDescription')}
        value={value.recentAssistantMessages}
        min={1}
        max={12}
        onChange={(next) => patch('recentAssistantMessages', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.repetitionGuard.maxCharactersPerMessage')}
        description={t('ai.repetitionGuard.maxCharactersPerMessageDescription')}
        value={value.maxCharactersPerMessage}
        min={120}
        max={4000}
        step={50}
        onChange={(next) => patch('maxCharactersPerMessage', Math.round(next))}
      />
    </ModuleSettingsCard>
  );
}
