import { useCallback, useState } from 'react';
import {
  backupReminderNow,
  noteBackupCompleted,
  readBackupReminderState,
  shouldSuggestBackup,
  dismissBackupReminder,
  writeBackupReminderState,
} from '../lib/backupReminder';

/// Persist the opt-out across restarts. Session state also hides the banner
/// immediately when local storage is unavailable in a restricted webview.
export function useBackupReminder(messageCount: number) {
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const show =
    !sessionDismissed &&
    shouldSuggestBackup(
      readBackupReminderState(),
      messageCount,
      backupReminderNow(),
    );

  const dismiss = useCallback(() => {
    writeBackupReminderState(
      dismissBackupReminder(readBackupReminderState(), backupReminderNow()),
    );
    setSessionDismissed(true);
  }, []);

  const markBackupDone = useCallback(() => {
    writeBackupReminderState(
      noteBackupCompleted(
        messageCount,
        backupReminderNow(),
        readBackupReminderState(),
      ),
    );
    setSessionDismissed(true);
  }, [messageCount]);

  return { show, dismiss, markBackupDone };
}
