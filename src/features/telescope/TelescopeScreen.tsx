import { Button } from '@heroui/react';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricGrid } from '../../components/ui/MetricGrid';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { UiModal } from '../../components/ui/UiModal';
import type { Provider, ProviderInput, ProviderModelResult } from '../../types';
import { ProviderCard } from './components/ProviderCard';
import { ProviderEditorModal } from './components/ProviderEditorModal';
import { useProviderEditor } from './useProviderEditor';

export function TelescopeScreen({
  providers,
  onFetchModels,
  onSave,
  onCheck,
  onDelete,
}: {
  providers: Provider[];
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onSave: (provider: ProviderInput, apiKey?: string) => Promise<Provider>;
  onCheck: (id: string) => Promise<Provider>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const editor = useProviderEditor({ onFetchModels, onSave });
  const connectedCount = providers.filter(
    (provider) => provider.status === 'connected',
  ).length;

  const checkOne = async (id: string) => {
    setCheckingId(id);
    try {
      await onCheck(id);
    } finally {
      setCheckingId('');
    }
  };

  const checkAll = async () => {
    if (checkingAll) return;
    setCheckingAll(true);
    for (const provider of providers) {
      try {
        await onCheck(provider.id);
      } catch {
        // Остальные подключения проверяются независимо.
      }
    }
    setCheckingAll(false);
  };

  const removeProvider = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <PageHeader
          title="Телескоп"
          description="Подключения, модели и параметры генерации."
          actions={
            <Button variant="primary" onPress={editor.openCreate} fullWidth>
              <Icon name="plus" className="size-4" /> Добавить
            </Button>
          }
        />

        <MetricGrid
          metrics={[
            { label: 'Доступны', value: connectedCount },
            { label: 'Подключения', value: providers.length },
            {
              label: 'Настроено моделей',
              value: providers.filter((provider) => provider.model).length,
            },
            {
              label: 'Сохранено ключей',
              value: providers.filter((provider) => provider.hasSecret).length,
            },
          ]}
        />

        <section className="space-y-4">
          <SectionHeader
            title="Подключения"
            description="Статус отражает последнюю фактическую проверку API."
            actions={
              providers.length > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  isPending={checkingAll}
                  onPress={() => void checkAll()}
                >
                  <Icon name="refresh" className="size-4" /> Проверить все
                </Button>
              ) : undefined
            }
          />

          {providers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  checking={checkingId === provider.id}
                  onCheck={() => void checkOne(provider.id)}
                  onEdit={() => editor.openEdit(provider)}
                  onDelete={() => setDeleteTarget(provider)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="telescope"
              title="Подключений пока нет"
              description="Добавьте провайдера и загрузите доступные модели из его API."
              action={{
                label: 'Добавить подключение',
                onPress: editor.openCreate,
                icon: <Icon name="plus" className="size-4" />,
              }}
              compact
            />
          )}
        </section>
      </div>

      <ProviderEditorModal
        isOpen={editor.isOpen}
        step={editor.step}
        form={editor.form}
        token={editor.token}
        models={editor.models}
        latency={editor.latency}
        loadingModels={editor.loadingModels}
        saving={editor.saving}
        error={editor.error}
        catalog={editor.catalog}
        onClose={editor.close}
        onStepChange={editor.setStep}
        onChooseKind={editor.chooseKind}
        onPatch={editor.patch}
        onTokenChange={editor.setToken}
        onLoadModels={() => void editor.loadModels()}
        onSave={() => void editor.save()}
      />

      <UiModal
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title="Удалить подключение?"
        description={
          deleteTarget
            ? `Подключение «${deleteTarget.name}» и сохранённый ключ будут удалены.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={deleting}
              onPress={() => setDeleteTarget(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              isPending={deleting}
              onPress={() => void removeProvider()}
            >
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Это действие нельзя отменить.</p>
        {deleteError ? (
          <p className="selectable mt-2 text-sm text-danger">{deleteError}</p>
        ) : null}
      </UiModal>
    </div>
  );
}
