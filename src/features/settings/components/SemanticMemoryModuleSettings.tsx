import { useTranslation } from 'react-i18next';
import type { Provider, SemanticMemorySettings } from '../../../types';
import { SettingSwitchRow } from '../../profile/components/SettingSwitchRow';
import {
  ModuleNumberField,
  ModuleProviderSelect,
  ModuleSettingsCard,
} from './ModuleFields';

export function SemanticMemoryModuleSettings({
  value,
  providers,
  onChange,
}: {
  value: SemanticMemorySettings;
  providers: Provider[];
  onChange: (value: SemanticMemorySettings) => void;
}) {
  const { t } = useTranslation('settings');
  const embeddingProviders = providers.filter((provider) =>
    Boolean(provider.embeddingModel?.trim()),
  );
  const patch = <K extends keyof SemanticMemorySettings>(
    key: K,
    next: SemanticMemorySettings[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <ModuleSettingsCard
      icon="database"
      title={t('ai.semantic.title')}
      description={t('ai.semantic.description')}
      enabledLabel={t('ai.semantic.enabled')}
      enabledDescription={t('ai.semantic.enabledDescription')}
      enabled={value.enabled}
      onEnabledChange={(enabled) => patch('enabled', enabled)}
    >
      <ModuleProviderSelect
        label={t('ai.semantic.provider')}
        description={t('ai.semantic.providerDescription')}
        value={value.providerId}
        providers={embeddingProviders}
        automaticLabel={t('ai.semantic.currentChatProvider')}
        onChange={(providerId) => patch('providerId', providerId)}
      />
      {embeddingProviders.length === 0 ? (
        <p className="py-3 text-xs leading-5 text-warning">
          {t('ai.semantic.noEmbeddingProviders')}
        </p>
      ) : null}
      <ModuleNumberField
        label={t('ai.semantic.topK')}
        description={t('ai.semantic.topKDescription')}
        value={value.topK}
        min={1}
        max={32}
        onChange={(next) => patch('topK', Math.round(next))}
      />
      <ModuleNumberField
        label={t('ai.semantic.threshold')}
        description={t('ai.semantic.thresholdDescription')}
        value={value.similarityThreshold}
        min={0}
        max={1}
        step={0.05}
        onChange={(next) => patch('similarityThreshold', next)}
      />
      <ModuleNumberField
        label={t('ai.semantic.batchSize')}
        description={t('ai.semantic.batchSizeDescription')}
        value={value.batchSize}
        min={1}
        max={64}
        onChange={(next) => patch('batchSize', Math.round(next))}
      />
      <SettingSwitchRow
        label={t('ai.semantic.rememberedMessages')}
        description={t('ai.semantic.rememberedMessagesDescription')}
        value={value.includeRememberedMessages}
        onChange={(next) => patch('includeRememberedMessages', next)}
      />
      <SettingSwitchRow
        label={t('ai.semantic.dynamicContext')}
        description={t('ai.semantic.dynamicContextDescription')}
        value={value.includeDynamicContext}
        onChange={(next) => patch('includeDynamicContext', next)}
      />
      <SettingSwitchRow
        label={t('ai.semantic.archivedMessages')}
        description={t('ai.semantic.archivedMessagesDescription')}
        value={value.indexArchivedMessages}
        onChange={(next) => patch('indexArchivedMessages', next)}
      />
      {value.indexArchivedMessages ? (
        <ModuleNumberField
          label={t('ai.semantic.archiveLimit')}
          description={t('ai.semantic.archiveLimitDescription')}
          value={value.archivedMessageLimit}
          min={20}
          max={5000}
          step={20}
          onChange={(next) => patch('archivedMessageLimit', Math.round(next))}
        />
      ) : null}
    </ModuleSettingsCard>
  );
}
