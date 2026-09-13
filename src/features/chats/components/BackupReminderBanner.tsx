import { Button } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import {
  datedJsonName,
  defaultExportDestination,
  exportJsonFile,
} from '../../../lib/jsonTransfer';
import { useBackupReminder } from '../../../hooks/useBackupReminder';

export function BackupReminderBanner({
  messageCount,
  onExportBackup,
}: {
  messageCount: number;
  onExportBackup: () => Promise<unknown>;
}) {
  const { t } = useTranslation('chats');
  const { show, snooze, markBackupDone } = useBackupReminder(messageCount);
  const [exporting, setExporting] = useState(false);

  if (!show) return null;

  const exportBackup = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const archive = await onExportBackup();
      const exported = await exportJsonFile(
        datedJsonName('galactrix-backup'),
        archive,
        defaultExportDestination(),
      );
      if (exported) markBackupDone();
    } catch {
      // Export failures surface through the settings flow; the reminder
      // stays visible for another visit.
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="status"
      className="mx-3 mt-3 flex flex-col gap-2.5 rounded-2xl border border-warning/35 bg-warning/10 p-3.5 sm:mx-4 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <strong className="block text-sm text-warning">
            {t('backupReminder.title')}
          </strong>
          <p className="mt-0.5 text-xs leading-5 text-muted">
            {t('backupReminder.description', {
              count: messageCount,
            })}
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          size="sm"
          variant="secondary"
          className="w-full sm:w-auto"
          isDisabled={exporting}
          onPress={snooze}
        >
          {t('backupReminder.notNow')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="w-full sm:w-auto"
          isPending={exporting}
          onPress={() => void exportBackup()}
        >
          <Icon name="download" className="size-4" />
          {t('backupReminder.export')}
        </Button>
      </div>
    </div>
  );
}
