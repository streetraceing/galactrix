import { Button, Checkbox } from '@heroui/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppIconTile } from '../../../components/ui/AppIconTile';
import { AppPanel } from '../../../components/ui/AppPanel';
import { ExportDestinationPicker } from '../../../components/ui/ExportOptions';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import {
  datedJsonName,
  defaultExportDestination,
  exportJsonFile,
  importJsonFile,
  type ExportDestination,
} from '../../../lib/jsonTransfer';
import type { AppBackupPreview } from '../../../types';

export function DataManagement({
  providerCount,
  generationActive,
  onCreateBackup,
  onInspectBackup,
  onRestoreBackup,
}: {
  providerCount: number;
  generationActive: boolean;
  onCreateBackup: (includeCredentials: boolean) => Promise<unknown>;
  onInspectBackup: (archive: unknown) => Promise<AppBackupPreview>;
  onRestoreBackup: (archive: unknown) => Promise<unknown>;
}) {
  const { t } = useTranslation('settings');
  const [exportOpen, setExportOpen] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [destination, setDestination] = useState<ExportDestination>(
    defaultExportDestination,
  );
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [archive, setArchive] = useState<unknown>();
  const [preview, setPreview] = useState<AppBackupPreview>();
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const openExport = () => {
    setIncludeCredentials(false);
    setDestination(defaultExportDestination());
    setExportOpen(true);
  };

  const exportBackup = async () => {
    if (exporting || generationActive) return;
    setExporting(true);
    try {
      const value = await onCreateBackup(includeCredentials);
      const exported = await exportJsonFile(
        datedJsonName('galactrix-backup'),
        value,
        destination,
      );
      if (!exported) return;
      setExportOpen(false);
      toast.success(t('dataManagement.backupSaved'), {
        description: includeCredentials
          ? t('dataManagement.backupContainsCredentials')
          : t('dataManagement.backupExcludesCredentials'),
      });
    } catch (caught) {
      toast.danger(t('dataManagement.exportFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setExporting(false);
    }
  };

  const selectBackup = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const selected = await importJsonFile();
      if (selected == null) return;
      const inspected = await onInspectBackup(selected);
      setArchive(selected);
      setPreview(inspected);
      setRestoreConfirmed(false);
    } catch (caught) {
      toast.danger(t('dataManagement.importFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setImporting(false);
    }
  };

  const closePreview = () => {
    if (restoring) return;
    setArchive(undefined);
    setPreview(undefined);
    setRestoreConfirmed(false);
  };

  const restoreBackup = async () => {
    if (
      restoring ||
      generationActive ||
      !restoreConfirmed ||
      archive == null ||
      preview == null
    ) {
      return;
    }
    setRestoring(true);
    try {
      await onRestoreBackup(archive);
      const restored = preview;
      setArchive(undefined);
      setPreview(undefined);
      setRestoreConfirmed(false);
      toast.success(t('dataManagement.restoreComplete'), {
        description: t('dataManagement.restoreCompleteDescription', {
          chats: restored.chatCount,
          messages: restored.messageCount,
        }),
      });
    } catch (caught) {
      toast.danger(t('dataManagement.restoreFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setRestoring(false);
    }
  };

  const previewStats = preview
    ? [
        [t('dataManagement.chats'), preview.chatCount],
        [t('dataManagement.messages'), preview.messageCount],
        [t('dataManagement.variants'), preview.variantCount],
        [t('dataManagement.galaxyItems'), preview.galaxyItemCount],
        [t('dataManagement.providers'), preview.providerCount],
        [t('dataManagement.usageDays'), preview.usageDayCount],
      ]
    : [];

  return (
    <div className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
      <AppPanel className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AppIconTile icon="database" />
          <div className="min-w-0 flex-1">
            <h2 className="section-title">{t('dataManagement.title')}</h2>
            <p className="section-description">
              {t('dataManagement.description')}
            </p>
          </div>
        </div>

        {generationActive ? (
          <div className="mt-4 rounded-xl border border-warning/35 bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground">
            {t('dataManagement.generationActive')}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <AppPanel emphasis="subtle" className="flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Icon name="download" className="size-4 text-accent" />
              <h3 className="text-sm font-semibold">
                {t('dataManagement.exportTitle')}
              </h3>
            </div>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">
              {t('dataManagement.exportDescription')}
            </p>
            <Button
              fullWidth
              variant="primary"
              className="mt-4"
              isDisabled={generationActive}
              onPress={openExport}
            >
              <Icon name="download" className="size-4" />
              {t('dataManagement.export')}
            </Button>
          </AppPanel>

          <AppPanel emphasis="subtle" className="flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Icon name="restore" className="size-4 text-accent" />
              <h3 className="text-sm font-semibold">
                {t('dataManagement.restoreTitle')}
              </h3>
            </div>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">
              {t('dataManagement.restoreDescription')}
            </p>
            <Button
              fullWidth
              variant="secondary"
              className="mt-4"
              isPending={importing}
              isDisabled={generationActive}
              onPress={() => void selectBackup()}
            >
              <Icon name="upload" className="size-4" />
              {t('dataManagement.selectBackup')}
            </Button>
          </AppPanel>
        </div>
      </AppPanel>

      <UiModal
        isOpen={exportOpen}
        onOpenChange={(open) => !exporting && setExportOpen(open)}
        onConfirm={() => void exportBackup()}
        isConfirmDisabled={exporting || generationActive}
        title={t('dataManagement.exportModalTitle')}
        description={t('dataManagement.exportModalDescription')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={exporting}
              onPress={() => setExportOpen(false)}
            >
              {t('dataManagement.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={exporting}
              isDisabled={generationActive}
              onPress={() => void exportBackup()}
            >
              {t('dataManagement.saveBackup')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AppPanel emphasis="subtle" className="p-4 sm:p-5">
            <Checkbox
              isSelected={includeCredentials}
              isDisabled={providerCount === 0}
              onChange={setIncludeCredentials}
            >
              <Checkbox.Content className="items-start gap-3">
                <Checkbox.Control className="mt-0.5">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span>
                  <strong className="block text-sm">
                    {t('dataManagement.includeCredentials')}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {t('dataManagement.includeCredentialsDescription')}
                  </span>
                </span>
              </Checkbox.Content>
            </Checkbox>
            {includeCredentials ? (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">
                {t('dataManagement.credentialsWarning')}
              </div>
            ) : null}
          </AppPanel>
          <ExportDestinationPicker
            value={destination}
            onChange={setDestination}
          />
        </div>
      </UiModal>

      <UiModal
        isOpen={preview != null}
        onOpenChange={(open) => !open && closePreview()}
        onConfirm={() => void restoreBackup()}
        isConfirmDisabled={
          restoring || generationActive || !restoreConfirmed || archive == null
        }
        title={t('dataManagement.previewTitle')}
        description={t('dataManagement.previewDescription')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={restoring}
              onPress={closePreview}
            >
              {t('dataManagement.cancel')}
            </Button>
            <Button
              variant="danger"
              autoFocus
              isPending={restoring}
              isDisabled={
                generationActive || !restoreConfirmed || archive == null
              }
              onPress={() => void restoreBackup()}
            >
              {t('dataManagement.restore')}
            </Button>
          </>
        }
      >
        {preview ? (
          <div className="space-y-4">
            <AppPanel emphasis="subtle" className="p-4">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">
                    {t('dataManagement.sourceVersion')}
                  </dt>
                  <dd className="mt-1 font-medium">
                    v{preview.sourceAppVersion}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">
                    {t('dataManagement.createdAt')}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {dateFormatter.format(new Date(preview.createdAt * 1_000))}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {previewStats.map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-background/55 px-3 py-2.5"
                  >
                    <span className="block text-lg font-semibold">
                      {numberFormatter.format(Number(value))}
                    </span>
                    <span className="block text-xs text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </AppPanel>

            <AppPanel emphasis="subtle" className="p-4">
              <div className="flex items-start gap-3">
                <Icon
                  name={preview.credentialsIncluded ? 'key' : 'shield'}
                  className="mt-0.5 size-4 shrink-0 text-accent"
                />
                <div>
                  <strong className="text-sm">
                    {preview.credentialsIncluded
                      ? t('dataManagement.credentialsIncluded', {
                          count: preview.credentialCount,
                        })
                      : t('dataManagement.credentialsExcluded')}
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {preview.credentialsIncluded
                      ? t('dataManagement.credentialsIncludedDescription')
                      : t('dataManagement.credentialsExcludedDescription')}
                  </p>
                </div>
              </div>
            </AppPanel>

            <div className="rounded-xl border border-danger/35 bg-danger/10 p-4">
              <strong className="text-sm text-danger">
                {t('dataManagement.replaceWarning')}
              </strong>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t('dataManagement.replaceWarningDescription')}
              </p>
              <Checkbox
                className="mt-3"
                isSelected={restoreConfirmed}
                isDisabled={restoring || generationActive}
                onChange={setRestoreConfirmed}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="text-sm font-medium">
                    {t('dataManagement.confirmRestore')}
                  </span>
                </Checkbox.Content>
              </Checkbox>
            </div>
          </div>
        ) : null}
      </UiModal>
    </div>
  );
}
