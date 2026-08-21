import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('full backups use an explicit versioned format and strict inspection', async () => {
  const [backup, databaseBackup] = await Promise.all([
    read('src-tauri/src/backup.rs'),
    read('src-tauri/src/db/backup.rs'),
  ]);

  assert.match(backup, /BACKUP_FORMAT_VERSION:\s*u32\s*=\s*1/);
  assert.match(backup, /archive\.format\s*!=\s*BACKUP_FORMAT/);
  assert.match(backup, /db::validate_backup_data\(&archive\.data\)/);
  assert.match(databaseBackup, /Connection::open_in_memory/);
  assert.match(databaseBackup, /replace_with_backup\(&transaction, data\)/);
  assert.match(databaseBackup, /transaction\.rollback/);
});

test('restore coordinates a database transaction with credential rollback', async () => {
  const source = await read('src-tauri/src/backup.rs');

  assert.match(source, /let transaction = connection\.unchecked_transaction/);
  assert.match(source, /db::replace_with_backup\(&transaction/);
  assert.match(source, /apply_secrets\(&affected_provider_ids/);
  assert.match(source, /transaction\s*\.rollback/);
  assert.match(source, /restore_secrets\(&previous_secrets\)/);
  assert.ok(
    source.indexOf('db::replace_with_backup(&transaction') <
      source.indexOf('transaction.commit()'),
  );
});

test('backup UI defaults to excluding secrets and requires restore consent', async () => {
  const [screen, controller, backend] = await Promise.all([
    read('src/features/settings/components/DataManagement.tsx'),
    read('src/app/useAppController.ts'),
    read('src/lib/backend.ts'),
  ]);

  assert.match(screen, /useState\(false\)/);
  assert.match(screen, /includeCredentials/);
  assert.match(screen, /credentialsWarning/);
  assert.match(screen, /restoreConfirmed/);
  assert.match(screen, /!restoreConfirmed/);
  assert.match(controller, /setSnapshot\(restored\)/);
  assert.match(backend, /inspect_app_backup/);
  assert.match(backend, /restore_app_backup/);
});
