import { useCallback, useState } from 'react';
import {
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
    shouldSuggestBackup(readBackupReminderState(), messageCount, Date.now());

  const snooze = useCallback(() => {
    writeBackupReminderState(
      snoozeBackup(readBackupReminderState(), Math.floor(Date.now() / 1_000)),
    );
    setSessionDismissed(true);
  }, []);

  const markBackupDone = useCallback(() => {
    writeBackupReminderState(
      noteBackupCompleted(messageCount, Math.floor(Date.now() / 1_000)),
    );
    setSessionDismissed(true);
  }, [messageCount]);

  return { show, snooze, markBackupDone };
}
