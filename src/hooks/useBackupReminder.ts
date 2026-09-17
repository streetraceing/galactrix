import { useCallback, useState } from 'react';
import {
  backupReminderNow,
  noteBackupCompleted,
  readBackupReminderState,
  shouldSuggestBackup,
  snoozeBackup,
  writeBackupReminderState,
} from '../lib/backupReminder';

/// Non-persistent session dismissal: after an export the reminder is cleared
/// via `markBackupDone`, "not now" only snoozes it for a few days.
export function useBackupReminder(messageCount: number) {
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const show =
    !sessionDismissed &&
    shouldSuggestBackup(
      readBackupReminderState(),
      messageCount,
      backupReminderNow(),
    );

  const snooze = useCallback(() => {
    writeBackupReminderState(
      snoozeBackup(readBackupReminderState(), backupReminderNow()),
    );
    setSessionDismissed(true);
  }, []);

  const markBackupDone = useCallback(() => {
    writeBackupReminderState(
      noteBackupCompleted(messageCount, backupReminderNow()),
    );
    setSessionDismissed(true);
  }, [messageCount]);

  return { show, snooze, markBackupDone };
}
