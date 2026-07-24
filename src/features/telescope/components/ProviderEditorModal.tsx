import { Button, Surface } from '@heroui/react';
import { UiModal } from '../../../components/ui/UiModal';
import type { providerCatalog } from '../../../data';
import type { ProviderInput, ProviderKind } from '../../../types';
import { GenerationSettings } from './GenerationSettings';
import { ProviderCredentials } from './ProviderCredentials';
import { ProviderModelSection } from './ProviderModelSection';
import { ProviderTypePicker } from './ProviderTypePicker';

type CatalogEntry = (typeof providerCatalog)[number];

export function ProviderEditorModal({
  isOpen,
  step,
  form,
  token,
  models,
  latency,
  loadingModels,
  saving,
  error,
  catalog,
  onClose,
  onStepChange,
  onChooseKind,
  onPatch,
  onTokenChange,
  onLoadModels,
  onSave,
}: {
  isOpen: boolean;
  step: 1 | 2;
  form: ProviderInput;
  token: string;
  models: string[];
  latency: number | null;
  loadingModels: boolean;
  saving: boolean;
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
  onSave: () => void;
}) {
  return (
    <UiModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={
        step === 1
          ? 'Новое подключение'
          : form.id
            ? 'Настройки подключения'
            : catalog.name
      }
      description={step === 1 ? 'Выберите тип API.' : catalog.description}
      footer={
        step === 2 ? (
          <>
            <span className="flex-1" />
            {!form.id ? (
              <Button
                variant="ghost"
                isDisabled={saving}
                onPress={() => onStepChange(1)}
              >
                Назад
              </Button>
            ) : null}
            <Button
              variant="primary"
              isPending={saving}
              isDisabled={
                !form.name.trim() ||
                !form.model.trim() ||
                form.kind === 'character-ai'
              }
              onPress={onSave}
            >
              Сохранить
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
            <Surface
              variant="tertiary"
              className="rounded-2xl border border-separator p-4 text-sm leading-6 text-warning"
            >
              Для Character.AI нужен отдельный адаптер авторизации и протокола.
              Несовместимое подключение не сохраняется.
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
            <ProviderModelSection
              form={form}
              models={models}
              latency={latency}
              loading={loadingModels}
              onPatch={onPatch}
              onLoadModels={onLoadModels}
            />
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
