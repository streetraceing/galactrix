import { Button, Surface } from '@heroui/react';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricGrid } from '../../components/ui/MetricGrid';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
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
  const editor = useProviderEditor({ onFetchModels, onSave, onDelete });
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

  return (
    <div className="page-scroll">
      <div className="page-container">
        <PageHeader
          title="Телескоп"
          description="Подключения, модели и параметры генерации."
          actions={
            <Button variant="primary" onPress={editor.openCreate}>
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

        <Surface variant="transparent" className="space-y-3">
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
            <div className="grid gap-3 lg:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  checking={checkingId === provider.id}
                  onCheck={() => void checkOne(provider.id)}
                  onEdit={() => editor.openEdit(provider)}
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
        </Surface>
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
        onDelete={() => void editor.remove()}
      />
    </div>
  );
}
