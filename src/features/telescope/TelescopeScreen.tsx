import { Button, Checkbox, Surface } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { toast } from '../../i18n/toast';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ExportDestinationPicker,
  ExportSelectionList,
} from '../../components/ui/ExportOptions';
import { MetricGrid } from '../../components/ui/MetricGrid';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { UiModal } from '../../components/ui/UiModal';
import {
  datedJsonName,
  defaultExportDestination,
  exportJsonFile,
  importJsonFile,
  type ExportDestination,
} from '../../lib/jsonTransfer';
import type {
  Provider,
  ProviderImportInput,
  ProviderInput,
  ProviderModelResult,
} from '../../types';
import { ProviderCard } from './components/ProviderCard';
import { ProviderEditorModal } from './components/ProviderEditorModal';
import { useProviderEditor } from './useProviderEditor';
import { createTelescopeExport, parseTelescopeExport } from './transfer';

export function TelescopeScreen({
  providers,
  onFetchModels,
  onExportSecrets,
  onImport,
  onSave,
  onCheck,
  onDelete,
}: {
  providers: Provider[];
  onFetchModels: (
    provider: ProviderInput,
    apiKey?: string,
  ) => Promise<ProviderModelResult>;
  onExportSecrets: (ids: string[]) => Promise<Record<string, string>>;
  onImport: (entries: ProviderImportInput[]) => Promise<number>;
  onSave: (provider: ProviderInput, apiKey?: string) => Promise<Provider>;
  onCheck: (id: string) => Promise<Provider>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [exportDestination, setExportDestination] = useState<ExportDestination>(
    defaultExportDestination,
  );
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const editor = useProviderEditor({ onFetchModels, onSave });
  const connectedCount = providers.filter(
    (provider) => provider.status === 'connected',
  ).length;

  useEffect(() => {
    const openProviderEditor = () => editor.openCreate();
    window.addEventListener('galactrix:new-provider', openProviderEditor);
    return () =>
      window.removeEventListener('galactrix:new-provider', openProviderEditor);
  }, [editor]);

  const checkOne = async (id: string) => {
    const providerName =
      providers.find((provider) => provider.id === id)?.name ?? 'Подключение';
    const toastId = toast(`Проверяем «${providerName}»`, {
      isLoading: true,
      timeout: 0,
    });
    setCheckingId(id);
    try {
      const checked = await onCheck(id);
      toast.close(toastId);
      if (checked.status === 'connected') {
        toast.success(`«${checked.name}» доступно`, {
          description:
            checked.latencyMs != null
              ? `Ответ за ${checked.latencyMs} мс`
              : 'Проверка завершена',
        });
      } else {
        toast.danger(`«${checked.name}» не отвечает`, {
          description: checked.hasSecret
            ? 'Проверьте адрес, модель и доступность API.'
            : 'Добавьте или обновите ключ доступа.',
        });
      }
    } catch (error) {
      toast.close(toastId);
      toast.danger(`Не удалось проверить «${providerName}»`, {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCheckingId('');
    }
  };

  const checkAll = async () => {
    if (checkingAll) return;
    setCheckingAll(true);
    const toastId = toast('Проверяем все подключения', {
      description: `Всего: ${providers.length}`,
      isLoading: true,
      timeout: 0,
    });
    let connected = 0;
    let failed = 0;
    for (const provider of providers) {
      try {
        const checked = await onCheck(provider.id);
        if (checked.status === 'connected') connected += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    toast.close(toastId);
    if (failed === 0) {
      toast.success('Все подключения доступны', {
        description: `Успешно проверено: ${connected}`,
      });
    } else if (connected === 0) {
      toast.danger('Нет доступных подключений', {
        description: `Проблем обнаружено: ${failed}`,
      });
    } else {
      toast.warning('Проверка завершена с ошибками', {
        description: `Доступно: ${connected} · с ошибкой: ${failed}`,
      });
    }
    setCheckingAll(false);
  };

  const removeProvider = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const removedName = deleteTarget.name;
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Подключение удалено', { description: removedName });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  };

  const exportConnections = async () => {
    if (transferring || exportIds.length === 0) return;
    const selectedProviders = providers.filter((provider) =>
      exportIds.includes(provider.id),
    );
    setTransferring(true);
    try {
      const secrets = includeSecrets ? await onExportSecrets(exportIds) : {};
      const exported = await exportJsonFile(
        datedJsonName('galactrix-telescope'),
        createTelescopeExport(selectedProviders, secrets),
        exportDestination,
      );
      if (!exported) return;
      setExportOpen(false);
      toast.success('Экспорт Телескопа готов', {
        description: includeSecrets
          ? `Подключения и API-ключи в JSON: ${Object.keys(secrets).length}`
          : `Подключений без API-ключей: ${selectedProviders.length}`,
      });
    } catch (error) {
      toast.danger('Не удалось экспортировать подключения', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTransferring(false);
    }
  };

  const importConnections = async () => {
    if (transferring) return;
    setTransferring(true);
    try {
      const raw = await importJsonFile();
      if (raw == null) return;
      const imported = parseTelescopeExport(raw);
      const importedCount = await onImport(imported);
      toast.success('Импорт Телескопа завершён', {
        description: `Добавлено или обновлено: ${importedCount}`,
      });
    } catch (error) {
      toast.danger('Не удалось импортировать подключения', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="page-scroll mobile-screen-enter flex-1">
      <div className="page-container">
        <PageHeader
          title="Телескоп"
          description="Подключения, модели и параметры генерации."
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isDisabled={providers.length === 0}
                onPress={() => {
                  setIncludeSecrets(false);
                  setExportIds(providers.map((provider) => provider.id));
                  setExportDestination(defaultExportDestination());
                  setExportOpen(true);
                }}
              >
                <Icon name="download" className="size-4" /> Экспорт
              </Button>
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isPending={transferring}
                onPress={() => void importConnections()}
              >
                <Icon name="upload" className="size-4" /> Импорт
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto"
                onPress={editor.openCreate}
              >
                <Icon name="plus" className="size-4" /> Добавить
              </Button>
            </div>
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
        isOpen={exportOpen}
        onOpenChange={(open) => !transferring && setExportOpen(open)}
        title="Экспорт подключений"
        description="JSON можно импортировать в Galactrix на другом устройстве."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={transferring}
              onPress={() => setExportOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              isPending={transferring}
              isDisabled={exportIds.length === 0}
              onPress={() => void exportConnections()}
            >
              Экспортировать
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <ExportSelectionList
            items={providers.map((provider) => ({
              id: provider.id,
              title: provider.name,
              description: provider.model || 'Модель не выбрана',
            }))}
            selectedIds={exportIds}
            onChange={setExportIds}
          />
          <section>
            <h3 className="mb-2 text-sm font-semibold">Данные подключения</h3>
            <Checkbox
              isSelected={includeSecrets}
              variant="secondary"
              className="w-full rounded-xl border border-separator"
              onChange={setIncludeSecrets}
            >
              <Checkbox.Content className="w-full items-start px-4 py-4">
                <Checkbox.Control className="mt-0.5">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="min-w-0">
                  <strong className="block text-sm">Включить API-ключи</strong>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    По умолчанию ключи остаются только в защищённом хранилище
                    этого устройства.
                  </span>
                </span>
              </Checkbox.Content>
            </Checkbox>
            {includeSecrets ? (
              <Surface className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">
                Файл будет содержать ключи открытым текстом. Храните его как
                пароль и не отправляйте посторонним.
              </Surface>
            ) : null}
          </section>
          <ExportDestinationPicker
            value={exportDestination}
            onChange={setExportDestination}
          />
        </div>
      </UiModal>

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
