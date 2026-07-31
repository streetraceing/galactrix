import { useTranslation } from 'react-i18next';
import type { RetrySettings } from '../../../types';
import { ModuleNumberField, ModuleSettingsCard } from './ModuleFields';

export function RetryModuleSettings({
  value,
  onChange,
}: {
  value: RetrySettings;
  onChange: (value: RetrySettings) => void;
}) {
  const { t } = useTranslation('settings');
  const patch = <K extends keyof RetrySettings>(
    key: K,
    next: RetrySettings[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <ModuleSettingsCard
      icon="refresh"
      title={t('ai.retry.title')}
      description={t('ai.retry.description')}
      enabledLabel={t('ai.retry.enabled')}
      enabledDescription={t('ai.retry.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <ModuleNumberField
        label={t('ai.retry.maxAttempts')}
        description={t('ai.retry.maxAttemptsDescription')}
        value={value.maxAttempts}
        min={1}
        max={8}
        onChange={(next) => patch('maxAttempts', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.retry.initialDelay')}
        description={t('ai.retry.initialDelayDescription')}
        value={value.initialDelayMs}
        min={100}
        max={60000}
        step={100}
        onChange={(next) => patch('initialDelayMs', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.retry.maxDelay')}
        description={t('ai.retry.maxDelayDescription')}
        value={value.maxDelayMs}
        min={100}
        max={300000}
        step={250}
        onChange={(next) => patch('maxDelayMs', Math.round(next))}
      />
    </ModuleSettingsCard>
  );
}
