import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  noteBackupCompleted,
  shouldSuggestBackup,
  dismissBackupReminder,
  readBackupReminderState,
  writeBackupReminderState,
  BACKUP_REMINDER_STORAGE_KEY,
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

test('not now remains dismissed after months, growth and manual backups', () => {
  const never = noteBackupCompleted(100, NOW - 8 * DAY);
  const snoozed = dismissBackupReminder(never, NOW - 1 * DAY);
  assert.equal(shouldSuggestBackup(snoozed, 200, NOW), false);
  assert.equal(shouldSuggestBackup(snoozed, 200, NOW + 3 * DAY), false);
  assert.equal(shouldSuggestBackup(snoozed, 2000, NOW + 365 * DAY), false);
  const backedUp = noteBackupCompleted(2000, NOW, snoozed);
  assert.equal(shouldSuggestBackup(backedUp, 4000, NOW + 365 * DAY), false);
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
  assert.match(hook, /dismissBackupReminder\(readBackupReminderState\(\)/);
  // Building the archive is not a backup: the reminder is recorded only after
  // the file reached the user, so a cancelled save dialog does not count.
  assert.doesNotMatch(
    controller,
    /createAppBackup\(includeCredentials\)\.then\(\(archive\) => \{[\s\S]{0,200}noteBackupCompleted/,
  );
  assert.match(controller, /const recordBackupExported = useCallback/);
  assert.match(controller, /recordBackupExported,/);
  // The banner renders on the chats screen with export + persistent dismiss actions.
  assert.match(chats, /<BackupReminderBanner/);
  assert.match(
    router,
    /onExportBackup=\{\(\) => controller\.createFullAppBackup\(false\)\}/,
  );
  assert.match(banner, /role="status"/);
  assert.match(banner, /exportJsonFile\(/);

  // The settings export records the same reminder once the file is written.
  const dataManagement = await read(
    'src/features/settings/components/DataManagement.tsx',
  );
  assert.match(
    dataManagement,
    /if \(!exported\) return;[\s\S]{0,120}onBackupExported\(\);/,
  );
});

test('dismissal survives a storage round trip and migrates legacy not-now', () => {
  const values = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });
  try {
    const dismissed = dismissBackupReminder(EMPTY_BACKUP_REMINDER_STATE, NOW);
    writeBackupReminderState(dismissed);
    assert.deepEqual(readBackupReminderState(), dismissed);
    assert.equal(
      shouldSuggestBackup(readBackupReminderState(), 1000, NOW + 90 * DAY),
      false,
    );

    values.set(
      BACKUP_REMINDER_STORAGE_KEY,
      JSON.stringify({
        lastBackupAt: null,
        messageCountAtBackup: 0,
        snoozedAt: NOW - 30 * DAY,
      }),
    );
    const legacy = readBackupReminderState();
    assert.equal(legacy.dismissed, true);
    assert.equal(shouldSuggestBackup(legacy, 1000, NOW), false);
    assert.equal(noteBackupCompleted(1000, NOW, legacy).dismissed, true);

    for (const raw of [
      'null',
      '[]',
      '42',
      '"text"',
      '{',
      '{"snoozedAt":-1,"lastBackupAt":1e999,"messageCountAtBackup":-5}',
    ]) {
      values.set(BACKUP_REMINDER_STORAGE_KEY, raw);
      assert.deepEqual(readBackupReminderState(), EMPTY_BACKUP_REMINDER_STATE);
    }
    values.set(
      BACKUP_REMINDER_STORAGE_KEY,
      '{"messageCountAtBackup":30.5,"dismissed":"false"}',
    );
    assert.equal(readBackupReminderState().messageCountAtBackup, 30);
    assert.equal(readBackupReminderState().dismissed, false);
    assert.equal(shouldSuggestBackup(readBackupReminderState(), 30, NOW), true);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('backup export reports errors and never treats cancellation as success', async () => {
  const banner = await read(
    'src/features/chats/components/BackupReminderBanner.tsx',
  );
  assert.match(banner, /if \(exported\) markBackupDone\(\)/);
  assert.match(banner, /catch \(caught\)[\s\S]*toast\.danger/);
  assert.match(banner, /finally[\s\S]*setExporting\(false\)/);
  assert.match(banner, /onPress=\{dismiss\}/);
  for (const source of [
    await read('src/hooks/useBackupReminder.ts'),
    await read('src/app/useAppController.ts'),
  ]) {
    assert.match(
      source,
      /noteBackupCompleted\([\s\S]{0,130}readBackupReminderState\(\)/,
    );
  }
});
