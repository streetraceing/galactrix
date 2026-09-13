import { readStorageItem, writeStorageItem } from './storage';

export type BackupReminderState = {
  /** Unix seconds of the last successful backup creation; null = never. */
  lastBackupAt: number | null;
  /** Message count observed when the last backup was created. */
  messageCountAtBackup: number;
  /** Unix seconds of the last "not now"; null = never snoozed. */
  snoozedAt: number | null;
};

export const BACKUP_REMINDER_STORAGE_KEY = 'galactrix-backup-reminder-v1';

const DAY_SECONDS = 86_400;
export const BACKUP_STALE_AFTER_DAYS = 7;
export const BACKUP_SNOOZE_DAYS = 3;
export const FIRST_BACKUP_MESSAGE_THRESHOLD = 30;
export const BACKUP_MESSAGE_GROWTH_THRESHOLD = 100;

export const EMPTY_BACKUP_REMINDER_STATE: BackupReminderState = {
  lastBackupAt: null,
  messageCountAtBackup: 0,
  snoozedAt: null,
};

export function readBackupReminderState(): BackupReminderState {
  const raw = readStorageItem(BACKUP_REMINDER_STORAGE_KEY);
  if (!raw) return EMPTY_BACKUP_REMINDER_STATE;
  try {
    const value = JSON.parse(raw) as Partial<BackupReminderState>;
    return {
      lastBackupAt:
        typeof value.lastBackupAt === 'number' ? value.lastBackupAt : null,
      messageCountAtBackup:
        typeof value.messageCountAtBackup === 'number'
          ? value.messageCountAtBackup
          : 0,
      snoozedAt: typeof value.snoozedAt === 'number' ? value.snoozedAt : null,
    };
  } catch {
    return EMPTY_BACKUP_REMINDER_STATE;
  }
}

export function writeBackupReminderState(state: BackupReminderState) {
  writeStorageItem(BACKUP_REMINDER_STORAGE_KEY, JSON.stringify(state));
}

/// True when the local data is worth protecting and the last backup is stale:
/// never backed up with real content, a week has passed, or the conversation
/// history grew by the growth threshold since the last backup — and the user
/// has not recently dismissed the reminder.
export function shouldSuggestBackup(
  state: BackupReminderState,
  messageCount: number,
  now: number,
): boolean {
  if (messageCount < FIRST_BACKUP_MESSAGE_THRESHOLD) return false;
  if (
    state.snoozedAt != null &&
    now - state.snoozedAt < BACKUP_SNOOZE_DAYS * DAY_SECONDS
  ) {
    return false;
  }
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
): BackupReminderState {
  return {
    lastBackupAt: now,
    messageCountAtBackup: messageCount,
    snoozedAt: null,
  };
}

export function snoozeBackup(
  state: BackupReminderState,
  now: number,
): BackupReminderState {
  return { ...state, snoozedAt: now };
}
