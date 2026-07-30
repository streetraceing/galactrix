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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('telescope');
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
      providers.find((provider) => provider.id === id)?.name ??
      t('telescopeScreen.connection');
    const toastId = toast(
      t('telescopeScreen.checkingProvider', { value1: providerName }),
      {
        isLoading: true,
        timeout: 0,
      },
    );
    setCheckingId(id);
    try {
      const checked = await onCheck(id);
      toast.close(toastId);
      if (checked.status === 'connected') {
        toast.success(
          t('telescopeScreen.providerAvailable', { value1: checked.name }),
          {
            description:
              checked.latencyMs != null
                ? t('telescopeScreen.responseLatency', {
                    value1: checked.latencyMs,
                  })
                : t('telescopeScreen.checkComplete'),
          },
        );
      } else {
        toast.danger(
          t('telescopeScreen.providerUnavailable', { value1: checked.name }),
          {
            description: checked.hasSecret
              ? t('telescopeScreen.checkTheAddressModelAndApiAvailability')
              : t('telescopeScreen.addOrUpdateTheAccessKey'),
          },
        );
      }
    } catch (error) {
      toast.close(toastId);
      toast.danger(
        t('telescopeScreen.checkProviderFailed', { value1: providerName }),
        {
          description: error instanceof Error ? error.message : String(error),
        },
      );
    } finally {
      setCheckingId('');
    }
  };

  const checkAll = async () => {
    if (checkingAll) return;
    setCheckingAll(true);
    const toastId = toast(t('telescopeScreen.checkingAllConnections'), {
      description: t('telescopeScreen.connectionTotal', {
        value1: providers.length,
      }),
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
      toast.success(t('telescopeScreen.allConnectionsAreAvailable'), {
        description: t('telescopeScreen.checkSuccessCount', {
          value1: connected,
        }),
      });
    } else if (connected === 0) {
      toast.danger(t('telescopeScreen.noConnectionsAreAvailable'), {
        description: t('telescopeScreen.checkFailureCount', {
          value1: failed,
        }),
      });
    } else {
      toast.warning(t('telescopeScreen.checkCompletedWithErrors'), {
        description: t('telescopeScreen.checkSummary', {
          value1: connected,
          value2: failed,
        }),
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
      toast.success(t('telescopeScreen.connectionRemoved'), {
        description: removedName,
      });
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
      toast.success(t('telescopeScreen.telescopeExportIsReady'), {
        description: includeSecrets
          ? t('telescopeScreen.exportedWithKeys', {
              value1: Object.keys(secrets).length,
            })
          : t('telescopeScreen.exportedWithoutKeys', {
              value1: selectedProviders.length,
            }),
      });
    } catch (error) {
      toast.danger(t('telescopeScreen.couldNotExportConnections'), {
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
      toast.success(t('telescopeScreen.telescopeImportComplete'), {
        description: t('telescopeScreen.importCount', {
          value1: importedCount,
        }),
      });
    } catch (error) {
      toast.danger(t('telescopeScreen.couldNotImportConnections'), {
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
          title={t('telescopeScreen.telescope')}
          description={t(
            'telescopeScreen.connectionsModelsAndGenerationSettings',
          )}
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
                <Icon name="download" className="size-4" />{' '}
                {t('telescopeScreen.export')}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                isPending={transferring}
                onPress={() => void importConnections()}
              >
                <Icon name="upload" className="size-4" />{' '}
                {t('telescopeScreen.import')}
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto"
                onPress={editor.openCreate}
              >
                <Icon name="plus" className="size-4" />{' '}
                {t('telescopeScreen.add')}
              </Button>
            </div>
          }
        />

        <MetricGrid
          metrics={[
            { label: t('telescopeScreen.available'), value: connectedCount },
            {
              label: t('telescopeScreen.connections'),
              value: providers.length,
            },
            {
              label: t('telescopeScreen.configuredModels'),
              value: providers.filter((provider) => provider.model).length,
            },
            {
              label: t('telescopeScreen.savedKeys'),
              value: providers.filter((provider) => provider.hasSecret).length,
            },
          ]}
        />

        <section className="space-y-4">
          <SectionHeader
            title={t('telescopeScreen.connections')}
            description={t(
              'telescopeScreen.statusReflectsTheLatestActualApiCheck',
            )}
            actions={
              providers.length > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  isPending={checkingAll}
                  onPress={() => void checkAll()}
                >
                  <Icon name="refresh" className="size-4" />{' '}
                  {t('telescopeScreen.checkAll')}
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
              title={t('telescopeScreen.noConnectionsYet')}
              description={t(
                'telescopeScreen.addAProviderAndLoadTheModelsAvailableFromIts',
              )}
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
        onConfirm={() => void exportConnections()}
        isConfirmDisabled={exportIds.length === 0 || transferring}
        title={t('telescopeScreen.exportConnections')}
        description={t(
          'telescopeScreen.theJsonFileCanBeImportedIntoGalactrixOnAnother',
        )}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={transferring}
              onPress={() => setExportOpen(false)}
            >
              {t('telescopeScreen.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={transferring}
              isDisabled={exportIds.length === 0}
              onPress={() => void exportConnections()}
            >
              {t('telescopeScreen.export2')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ExportSelectionList
            items={providers.map((provider) => ({
              id: provider.id,
              title: provider.name,
              description: provider.model || t('providerCard.noModelSelected'),
            }))}
            selectedIds={exportIds}
            onChange={setExportIds}
          />
          <Surface className="rounded-2xl border border-separator bg-surface-secondary/50 p-4 sm:p-5">
            <h3 className="mb-4 text-sm font-semibold">
              {t('telescopeScreen.connectionData')}
            </h3>
            <Checkbox
              isSelected={includeSecrets}
              variant="secondary"
              className="w-full rounded-xl border border-separator bg-background/35"
              onChange={setIncludeSecrets}
            >
              <Checkbox.Content className="w-full items-start px-4 py-4">
                <Checkbox.Control className="mt-0.5">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="min-w-0">
                  <strong className="block text-sm">
                    {t('telescopeScreen.includeApiKeys')}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {t(
                      'telescopeScreen.byDefaultKeysRemainOnlyInSecureStorageOnThis',
                    )}
                  </span>
                </span>
              </Checkbox.Content>
            </Checkbox>
            {includeSecrets ? (
              <Surface className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">
                {t('telescopeScreen.theFileWillContainKeysAsPlainTextTreatIt')}
              </Surface>
            ) : null}
          </Surface>
          <ExportDestinationPicker
            value={exportDestination}
            onChange={setExportDestination}
          />
        </div>
      </UiModal>

      <UiModal
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        onConfirm={() => void removeProvider()}
        isConfirmDisabled={!deleteTarget || deleting}
        title={t('telescopeScreen.deleteConnection')}
        description={
          deleteTarget
            ? t('telescopeScreen.deleteConnectionDescription', {
                value1: deleteTarget.name,
              })
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={deleting}
              onPress={() => setDeleteTarget(null)}
            >
              {t('telescopeScreen.cancel')}
            </Button>
            <Button
              variant="danger"
              autoFocus
              isPending={deleting}
              onPress={() => void removeProvider()}
            >
              {t('providerCard.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {t('telescopeScreen.thisActionCannotBeUndone')}
        </p>
        {deleteError ? (
          <p className="selectable mt-2 text-sm text-danger">{deleteError}</p>
        ) : null}
      </UiModal>
    </div>
  );
}
