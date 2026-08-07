import { useTranslation } from 'react-i18next';
import type { ResponseCleanupSettings } from '../../../types';
import { SettingSwitchRow } from '../../profile/components/SettingSwitchRow';
import { ModuleSettingsCard } from './ModuleFields';

export function ResponseCleanupModuleSettings({
  value,
  onChange,
}: {
  value: ResponseCleanupSettings;
  onChange: (value: ResponseCleanupSettings) => void;
}) {
  const { t } = useTranslation('settings');
  const patch = <K extends keyof ResponseCleanupSettings>(
    key: K,
    next: ResponseCleanupSettings[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <ModuleSettingsCard
      moduleId="responseCleanup"
      icon="sparkles"
      title={t('ai.responseCleanup.title')}
      description={t('ai.responseCleanup.description')}
      enabledLabel={t('ai.responseCleanup.enabled')}
      enabledDescription={t('ai.responseCleanup.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <SettingSwitchRow
        label={t('ai.responseCleanup.collapseBlankLines')}
        description={t('ai.responseCleanup.collapseBlankLinesDescription')}
        value={value.collapseBlankLines}
        onChange={(next) => patch('collapseBlankLines', next)}
      />
      <SettingSwitchRow
        label={t('ai.responseCleanup.removeDuplicatedTail')}
        description={t('ai.responseCleanup.removeDuplicatedTailDescription')}
        value={value.removeDuplicatedTail}
        onChange={(next) => patch('removeDuplicatedTail', next)}
      />
    </ModuleSettingsCard>
  );
}
