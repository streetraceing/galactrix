import { readStorageItem, writeStorageItem } from './storage';

export type BackupReminderState = {
  /** Unix seconds of the last successful backup creation; null = never. */
  lastBackupAt: number | null;
  /** Message count observed when the last backup was created. */
  messageCountAtBackup: number;
  /** Legacy timestamp retained to honour dismissals saved by older versions. */
  snoozedAt: number | null;
  /** Device-local preference: never automatically prompt again after "not now". */
  dismissed: boolean;
};

export const BACKUP_REMINDER_STORAGE_KEY = 'galactrix-backup-reminder-v1';

const DAY_SECONDS = 86_400;
export const BACKUP_STALE_AFTER_DAYS = 7;
export const FIRST_BACKUP_MESSAGE_THRESHOLD = 30;
export const BACKUP_MESSAGE_GROWTH_THRESHOLD = 100;

export const EMPTY_BACKUP_REMINDER_STATE: BackupReminderState = {
  lastBackupAt: null,
  messageCountAtBackup: 0,
  snoozedAt: null,
  dismissed: false,
};

/// The reminder compares against the unix-second timestamps the backend uses.
/// Callers must not mix in millisecond clocks.
export function backupReminderNow() {
  return Math.floor(Date.now() / 1_000);
}

export function readBackupReminderState(): BackupReminderState {
  const raw = readStorageItem(BACKUP_REMINDER_STORAGE_KEY);
  if (!raw) return { ...EMPTY_BACKUP_REMINDER_STATE };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ...EMPTY_BACKUP_REMINDER_STATE };
    }
    const stored = value as Partial<BackupReminderState>;
    const timestamp = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : null;
    const snoozedAt = timestamp(stored.snoozedAt);
    return {
      lastBackupAt: timestamp(stored.lastBackupAt),
      messageCountAtBackup: Math.floor(
        timestamp(stored.messageCountAtBackup) ?? 0,
      ),
      snoozedAt,
      dismissed: stored.dismissed === true || snoozedAt !== null,
    };
  } catch {
    return { ...EMPTY_BACKUP_REMINDER_STATE };
  }
}

export function writeBackupReminderState(state: BackupReminderState) {
  writeStorageItem(BACKUP_REMINDER_STORAGE_KEY, JSON.stringify(state));
}

/// True when the local data is worth protecting and the last backup is stale:
/// never backed up with real content, a week has passed, or the conversation
/// history grew by the growth threshold since the last backup — and the user
/// has not opted out on this device. Manual backups remain available in Settings.
export function shouldSuggestBackup(
  state: BackupReminderState,
  messageCount: number,
  now: number,
): boolean {
  if (state.dismissed || state.snoozedAt != null) return false;
  if (messageCount < FIRST_BACKUP_MESSAGE_THRESHOLD) return false;
  if (state.lastBackupAt == null) return true;
  if (now - state.lastBackupAt >= BACKUP_STALE_AFTER_DAYS * DAY_SECONDS) {
    return true;
  }
  return (
    messageCount - state.messageCountAtBackup >= BACKUP_MESSAGE_GROWTH_THRESHOLD
  );
}

export function noteBackupCompleted(
  messageCount: number,
  now: number,
  previous: BackupReminderState = EMPTY_BACKUP_REMINDER_STATE,
): BackupReminderState {
  return {
    lastBackupAt: now,
    messageCountAtBackup: messageCount,
    snoozedAt: null,
    dismissed: previous.dismissed || previous.snoozedAt != null,
  };
}

export function dismissBackupReminder(
  state: BackupReminderState,
  now: number,
): BackupReminderState {
  return { ...state, snoozedAt: now, dismissed: true };
}
