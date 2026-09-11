import { Button } from '@heroui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { AppIconTile } from '../../../components/ui/AppIconTile';
import { AppPanel } from '../../../components/ui/AppPanel';
import { ExportDestinationPicker } from '../../../components/ui/ExportOptions';
import { MetricGrid } from '../../../components/ui/MetricGrid';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { UiModal } from '../../../components/ui/UiModal';
import { toast } from '../../../i18n/toast';
import { errorMessage } from '../../../lib/errors';
import {
  datedJsonName,
  defaultExportDestination,
  exportJsonFile,
  type ExportDestination,
} from '../../../lib/jsonTransfer';
import type {
  DatabaseHealthReport,
  HealthIssue,
  HealthRepairReport,
} from '../../../types';
import {
  formatByteSize,
  HEALTH_ISSUE_KEYS,
  HEALTH_TABLE_KEYS,
  HEALTH_UNIT_KEYS,
} from '../dataHealth';

const severityStyles: Record<
  HealthIssue['severity'],
  { icon: 'close' | 'info'; className: string }
> = {
  error: {
    icon: 'close',
    className: 'border-danger/35 bg-danger/10',
  },
  warning: {
    icon: 'info',
    className: 'border-warning/35 bg-warning/10',
  },
  info: {
    icon: 'info',
    className: 'border-default bg-background/55',
  },
};

export function DataHealthCenter({
  generationActive,
  onRunDiagnostics,
  onRepairIssues,
}: {
  generationActive: boolean;
  onRunDiagnostics: () => Promise<DatabaseHealthReport>;
  onRepairIssues: () => Promise<HealthRepairReport>;
}) {
  const { t } = useTranslation('settings');
  const [report, setReport] = useState<DatabaseHealthReport>();
  const [running, setRunning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [destination, setDestination] = useState<ExportDestination>(() =>
    defaultExportDestination(),
  );
  const autoRan = useRef(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const runDiagnostics = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const value = await onRunDiagnostics();
      setReport(value);
    } catch (caught) {
      toast.danger(t('dataHealth.diagnosticsFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setRunning(false);
    }
  }, [onRunDiagnostics, running, t]);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    void runDiagnostics();
  }, [runDiagnostics]);

  const repairableIssues = useMemo(
    () => report?.issues.filter((issue) => issue.repairable) ?? [],
    [report],
  );
  const repairableTotal = repairableIssues.reduce(
    (total, issue) => total + issue.affected,
    0,
  );

  const repairIssues = async () => {
    if (repairing || generationActive || repairableIssues.length === 0) return;
    setRepairing(true);
    try {
      const repaired = await onRepairIssues();
      setReport(repaired.report);
      setRepairOpen(false);
      const repairedTotal = repaired.actions.reduce(
        (total, action) => total + action.affected,
        0,
      );
      toast.success(t('dataHealth.repairComplete', { count: repairedTotal }));
    } catch (caught) {
      toast.danger(t('dataHealth.repairFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setRepairing(false);
    }
  };

  const exportReport = async () => {
    if (exporting || !report) return;
    setExporting(true);
    try {
      const exported = await exportJsonFile(
        datedJsonName('galactrix-diagnostics'),
        report,
        destination,
      );
      if (!exported) return;
      setExportOpen(false);
      toast.success(t('dataHealth.reportSaved'));
    } catch (caught) {
      toast.danger(t('dataHealth.exportFailed'), {
        description: errorMessage(caught),
      });
    } finally {
      setExporting(false);
    }
  };

  const healthy =
    report != null && report.integrityOk && report.issues.length === 0;
  const databaseSize = report ? formatByteSize(report.databaseSizeBytes) : null;
  const walSize = report ? formatByteSize(report.walSizeBytes) : null;

  const metrics = (report?.tables ?? []).map((table) => ({
    label: HEALTH_TABLE_KEYS[table.name]
      ? t(HEALTH_TABLE_KEYS[table.name])
      : table.name,
    value: numberFormatter.format(table.rows),
  }));

  return (
    <div className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
      <AppPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <AppIconTile icon="shield" />
            <div className="min-w-0">
              <h2 className="section-title">{t('dataHealth.title')}</h2>
              <p className="section-description">
                {t('dataHealth.description')}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row">
            {report ? (
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                isDisabled={exporting}
                onPress={() => {
                  setDestination(defaultExportDestination());
                  setExportOpen(true);
                }}
              >
                <Icon name="download" className="size-4" />
                {t('dataHealth.exportReport')}
              </Button>
            ) : null}
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              isPending={running}
              onPress={() => void runDiagnostics()}
            >
              <Icon name="refresh" className="size-4" />
              {t('dataHealth.runDiagnostics')}
            </Button>
          </div>
        </div>

        {generationActive ? (
          <div className="mt-4 rounded-xl border border-warning/35 bg-warning/10 px-3 py-2.5 text-sm text-warning">
            {t('dataHealth.generationActive')}
          </div>
        ) : null}

        {running && !report ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted"
          >
            {t('dataHealth.checking')}
          </div>
        ) : null}

        {report ? (
          healthy ? (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-xl border border-success/35 bg-success/10 px-3 py-2.5"
            >
              <Icon
                name="check"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              <div>
                <strong className="block text-sm text-success">
                  {t('dataHealth.statusOk')}
                </strong>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {t('dataHealth.statusOkDescription')}
                </p>
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-xl border border-warning/35 bg-warning/10 px-3 py-2.5"
            >
              <Icon
                name="info"
                className="mt-0.5 size-4 shrink-0 text-warning"
              />
              <div>
                <strong className="block text-sm text-warning">
                  {t('dataHealth.statusIssues')}
                </strong>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {t('dataHealth.statusIssuesDescription')}
                </p>
              </div>
            </div>
          )
        ) : null}

        {report ? (
          <p className="mt-4 text-xs leading-5 text-muted">
            {t('dataHealth.checkedAt', {
              date: dateFormatter.format(new Date(report.createdAt * 1_000)),
            })}
            {' · '}
            {t('dataHealth.databaseSize', {
              size: `${databaseSize?.value ?? '0'} ${t(
                HEALTH_UNIT_KEYS[databaseSize?.unit ?? 'byte'],
              )}`,
            })}
            {' · '}
            {t('dataHealth.walSize', {
              size: `${walSize?.value ?? '0'} ${t(HEALTH_UNIT_KEYS[walSize?.unit ?? 'byte'])}`,
            })}
          </p>
        ) : null}
      </AppPanel>

      {report && metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}

      {report && !report.integrityOk ? (
        <AppPanel className="p-4 sm:p-5">
          <SectionHeader title={t('dataHealth.integrityFailed')} />
          <ul className="mt-3 space-y-1.5">
            {report.integrityMessages.map((message) => (
              <li
                key={message}
                className="break-words rounded-lg bg-danger/10 px-3 py-2 font-mono text-xs text-danger"
              >
                {message}
              </li>
            ))}
          </ul>
        </AppPanel>
      ) : null}

      {report ? (
        <AppPanel className="p-4 sm:p-5">
          <SectionHeader
            title={t('dataHealth.issuesTitle')}
            description={t('dataHealth.privacyNote')}
            actions={
              <Button
                variant="primary"
                isDisabled={
                  repairableIssues.length === 0 || generationActive || running
                }
                onPress={() => setRepairOpen(true)}
              >
                <Icon name="restore" className="size-4" />
                {t('dataHealth.repair')}
              </Button>
            }
          />

          {report.issues.length === 0 ? (
            <p className="mt-4 rounded-xl border border-default bg-background/55 px-3 py-2.5 text-sm text-muted">
              {t('dataHealth.noIssues')}
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {report.issues.map((issue) => {
                const meta = HEALTH_ISSUE_KEYS[issue.id];
                const style = severityStyles[issue.severity];
                return (
                  <div
                    key={issue.id}
                    className={`rounded-xl border px-3 py-2.5 ${style.className}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon
                        name={style.icon}
                        className="mt-0.5 size-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <strong className="text-sm">
                            {meta ? t(meta.title) : issue.id}
                          </strong>
                          <span className="text-xs font-medium">
                            {t('dataHealth.affected', {
                              count: issue.affected,
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {meta ? t(meta.description) : null}
                        </p>
                        {issue.samples.length > 0 ? (
                          <p className="mt-1.5 break-all font-mono text-[11px] leading-4 text-muted">
                            {issue.samples.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppPanel>
      ) : null}

      <UiModal
        isOpen={repairOpen}
        onOpenChange={(open) => !repairing && setRepairOpen(open)}
        onConfirm={() => void repairIssues()}
        isConfirmDisabled={repairing || generationActive}
        title={t('dataHealth.repairTitle')}
        description={t('dataHealth.repairDescription')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={repairing}
              onPress={() => setRepairOpen(false)}
            >
              {t('dataHealth.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={repairing}
              isDisabled={generationActive}
              onPress={() => void repairIssues()}
            >
              {t('dataHealth.repair')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted">
            {t('dataHealth.repairScope', { count: repairableTotal })}
          </p>
          <div className="space-y-2">
            {repairableIssues.map((issue) => {
              const meta = HEALTH_ISSUE_KEYS[issue.id];
              return (
                <div
                  key={issue.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-default bg-background/55 px-3 py-2.5"
                >
                  <span className="min-w-0 text-sm">
                    {meta ? t(meta.title) : issue.id}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-muted">
                    {t('dataHealth.affected', { count: issue.affected })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-warning/35 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-warning">
            {t('dataHealth.repairBackupNote')}
          </div>
        </div>
      </UiModal>

      <UiModal
        isOpen={exportOpen}
        onOpenChange={(open) => !exporting && setExportOpen(open)}
        onConfirm={() => void exportReport()}
        isConfirmDisabled={exporting || !report}
        title={t('dataHealth.exportTitle')}
        description={t('dataHealth.exportDescription')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={exporting}
              onPress={() => setExportOpen(false)}
            >
              {t('dataHealth.cancel')}
            </Button>
            <Button
              variant="primary"
              autoFocus
              isPending={exporting}
              isDisabled={!report}
              onPress={() => void exportReport()}
            >
              {t('dataHealth.saveReport')}
            </Button>
          </>
        }
      >
        <ExportDestinationPicker
          value={destination}
          onChange={setDestination}
        />
      </UiModal>
    </div>
  );
}
