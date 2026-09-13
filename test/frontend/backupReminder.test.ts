import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  noteBackupCompleted,
  shouldSuggestBackup,
  snoozeBackup,
  EMPTY_BACKUP_REMINDER_STATE,
} from '../../src/lib/backupReminder';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

// The module works in unix seconds (matching backend timestamps).
const DAY = 86_400;
const NOW = 1_800_000_000;

test('backup reminder appears for real content when stale or never backed up', () => {
  // New user, too little content: no nag.
  assert.equal(
    shouldSuggestBackup(EMPTY_BACKUP_REMINDER_STATE, 10, NOW),
    false,
  );
  // Never backed up with real content: nudge.
  assert.equal(shouldSuggestBackup(EMPTY_BACKUP_REMINDER_STATE, 30, NOW), true);
  // Recent backup: quiet even with growth.
  const recent = noteBackupCompleted(100, NOW - 2 * DAY);
  assert.equal(shouldSuggestBackup(recent, 150, NOW), false);
  // A week since the last backup: nudge again.
  const stale = noteBackupCompleted(100, NOW - 8 * DAY);
  assert.equal(shouldSuggestBackup(stale, 105, NOW), true);
  // Recent backup but heavy growth: nudge before the week passes.
  const grown = noteBackupCompleted(100, NOW - 2 * DAY);
  assert.equal(shouldSuggestBackup(grown, 250, NOW), true);
});

test('snoozing silences the reminder for the snooze window only', () => {
  const never = noteBackupCompleted(100, NOW - 8 * DAY);
  const snoozed = snoozeBackup(never, NOW - 1 * DAY);
  assert.equal(shouldSuggestBackup(snoozed, 200, NOW), false);
  assert.equal(shouldSuggestBackup(snoozed, 200, NOW + 3 * DAY), true);
});

test('backup completion is recorded in settings storage and the reminder banner is wired', async () => {
  const [reminder, hook, banner, chats, router, controller] = await Promise.all(
    [
      read('src/lib/backupReminder.ts'),
      read('src/hooks/useBackupReminder.ts'),
      read('src/features/chats/components/BackupReminderBanner.tsx'),
      read('src/features/chats/ChatsScreen.tsx'),
      read('src/app/AppScreenRouter.tsx'),
      read('src/app/useAppController.ts'),
    ],
  );

  assert.match(reminder, /BACKUP_STALE_AFTER_DAYS = 7/);
  assert.match(reminder, /BACKUP_MESSAGE_GROWTH_THRESHOLD = 100/);
  assert.match(
    reminder,
    /BACKUP_REMINDER_STORAGE_KEY = 'galactrix-backup-reminder-v1'/,
  );
  assert.match(hook, /snoozeBackup\(readBackupReminderState\(\)/);
  // The controller records a backup as soon as the archive is created.
  assert.match(
    controller,
    /createAppBackup\(includeCredentials\)\.then\(\(archive\) => \{[\s\S]{0,200}noteBackupCompleted/,
  );
  // The banner renders on the chats screen with export + snooze actions.
  assert.match(chats, /<BackupReminderBanner/);
  assert.match(
    router,
    /onExportBackup=\{\(\) => controller\.createFullAppBackup\(false\)\}/,
  );
  assert.match(banner, /role="status"/);
  assert.match(banner, /exportJsonFile\(/);
});
