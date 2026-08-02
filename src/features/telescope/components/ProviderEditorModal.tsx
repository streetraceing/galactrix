import { Button, Surface } from '@heroui/react';
import { UiModal } from '../../../components/ui/UiModal';
import type { providerCatalog } from '../catalog';
import type {
  EmbeddingProbeResult,
  ProviderInput,
  ProviderKind,
} from '../../../types';
import { GenerationSettings } from './GenerationSettings';
import { ProviderCredentials } from './ProviderCredentials';
import { ProviderEmbeddingSection } from './ProviderEmbeddingSection';
import { ProviderModelSection } from './ProviderModelSection';
import { ProviderTypePicker } from './ProviderTypePicker';
import { useTranslation } from 'react-i18next';

type CatalogEntry = (typeof providerCatalog)[number];

export function ProviderEditorModal({
  isOpen,
  step,
  form,
  token,
  models,
  latency,
  loadingModels,
  testingEmbeddings,
  embeddingProbe,
  saving,
  loadingCredentials,
  error,
  catalog,
  onClose,
  onStepChange,
  onChooseKind,
  onPatch,
  onTokenChange,
  onLoadModels,
  onTestEmbeddings,
  onSave,
}: {
  isOpen: boolean;
  step: 1 | 2;
  form: ProviderInput;
  token: string;
  models: string[];
  latency: number | null;
  loadingModels: boolean;
  testingEmbeddings: boolean;
  embeddingProbe: EmbeddingProbeResult | null;
  saving: boolean;
  loadingCredentials: boolean;
  error: string;
  catalog: CatalogEntry;
  onClose: () => void;
  onStepChange: (step: 1 | 2) => void;
  onChooseKind: (kind: ProviderKind) => void;
  onPatch: <K extends keyof ProviderInput>(
    key: K,
    value: ProviderInput[K],
  ) => void;
  onTokenChange: (value: string) => void;
  onLoadModels: () => void;
  onTestEmbeddings: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation('telescope');
  const canSave =
    step === 2 &&
    Boolean(form.name.trim()) &&
    Boolean(form.model.trim()) &&
    form.kind !== 'character-ai' &&
    !saving &&
    !loadingCredentials;

  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={step === 2 ? onSave : undefined}
      isConfirmDisabled={!canSave}
      size="lg"
      title={
        step === 1
          ? t('providerEditorModal.newConnection')
          : form.id
            ? t('providerEditorModal.connectionSettings')
            : catalog.name
      }
      description={
        step === 1
          ? t('providerEditorModal.selectAnApiType')
          : catalog.description
      }
      footer={
        step === 2 ? (
          <>
            <span className="hidden flex-1 sm:block" />
            {!form.id ? (
              <Button
                variant="ghost"
                isDisabled={saving}
                onPress={() => onStepChange(1)}
              >
                {t('providerEditorModal.back')}
              </Button>
            ) : null}
            <Button
              variant="primary"
              isPending={saving || loadingCredentials}
              isDisabled={!canSave}
              onPress={onSave}
            >
              {t('providerEditorModal.save')}
            </Button>
          </>
        ) : undefined
      }
    >
      {step === 1 ? (
        <ProviderTypePicker onChoose={onChooseKind} />
      ) : (
        <div className="space-y-4">
          {form.kind === 'character-ai' ? (
            <Surface className="rounded-2xl border border-separator p-4 text-sm leading-6 text-warning bg-surface-secondary/50">
              {t(
                'providerEditorModal.characterAiNeedsADedicatedAuthenticationAndProtocolAdapterAn',
              )}
            </Surface>
          ) : null}

          <ProviderCredentials
            form={form}
            token={token}
            catalog={catalog}
            onPatch={onPatch}
            onTokenChange={onTokenChange}
          />

          {form.kind !== 'character-ai' ? (
            <>
              <ProviderModelSection
                form={form}
                models={models}
                latency={latency}
                loading={loadingModels}
                onPatch={onPatch}
                onLoadModels={onLoadModels}
              />
              <ProviderEmbeddingSection
                form={form}
                testing={testingEmbeddings}
                probe={embeddingProbe}
                onPatch={onPatch}
                onTest={onTestEmbeddings}
              />
            </>
          ) : null}

          <GenerationSettings form={form} onPatch={onPatch} />
          {error ? (
            <p className="selectable text-sm text-danger">{error}</p>
          ) : null}
        </div>
      )}
    </UiModal>
  );
}
