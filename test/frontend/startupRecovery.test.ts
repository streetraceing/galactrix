import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadStartupData, StartupTimeoutError } from '../../src/lib/startup.ts';
const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('startup preserves jobs-before-snapshot ordering', async () => {
  const order: string[] = [];
  const result = await loadStartupData(
    async () => {
      order.push('jobs');
      return [1];
    },
    async () => {
      order.push('snapshot');
      return { ready: true };
    },
  );
  assert.deepEqual(order, ['jobs', 'snapshot']);
  assert.deepEqual(result, { jobs: [1], snapshot: { ready: true } });
});
test('hung job IPC reaches a recoverable deadline and cannot start a late snapshot', async () => {
  const jobs = deferred<number[]>();
  let snapshots = 0;
  await assert.rejects(
    loadStartupData(
      () => jobs.promise,
      async () => {
        snapshots++;
        return 1;
      },
      10,
    ),
    StartupTimeoutError,
  );
  jobs.resolve([]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(snapshots, 0);
});
test('hung snapshot IPC times out and a fresh attempt succeeds independently', async () => {
  const snapshot = deferred<string>();
  await assert.rejects(
    loadStartupData(
      async () => [],
      () => snapshot.promise,
      10,
    ),
    StartupTimeoutError,
  );
  assert.equal(
    (
      await loadStartupData(
        async () => [],
        async () => 'fresh',
        100,
      )
    ).snapshot,
    'fresh',
  );
  snapshot.resolve('stale');
});
test('startup propagates read failures instead of masking them as timeouts', async () => {
  const error = new Error('database unavailable');
  await assert.rejects(
    loadStartupData(
      async () => {
        throw error;
      },
      async () => 'unused',
      100,
    ),
    (candidate) => candidate === error,
  );
});
test('startup clears its deadline after successful and failed reads', async () => {
  const original = globalThis.clearTimeout;
  let cleared = 0;
  globalThis.clearTimeout = ((...args: Parameters<typeof clearTimeout>) => {
    cleared++;
    return original(...args);
  }) as typeof clearTimeout;
  try {
    await loadStartupData(
      async () => [],
      async () => 1,
    );
    await assert.rejects(
      loadStartupData(
        async () => [],
        async () => {
          throw new Error('read');
        },
      ),
    );
    assert.equal(cleared, 2);
  } finally {
    globalThis.clearTimeout = original;
  }
});
test('boot accepts only its latest attempt, invalidates on unmount and uses existing retry UI', () => {
  const controller = read('src/app/useAppController.ts');
  const boot = controller.slice(
    controller.indexOf('  const boot ='),
    controller.indexOf('    if (loading || activeTab'),
  );
  assert.match(
    boot,
    /await loadStartupData\(\s*listGenerationJobs,\s*loadSnapshot,?\s*\)/,
  );
  assert.match(boot, /if \(request !== bootRequestRef.current\) return;/);
  assert.ok(
    boot.indexOf('if (request !== bootRequestRef.current) return;') <
      boot.indexOf('setSnapshot(data)'),
  );
  assert.match(controller, /bootRequestRef.current \+= 1/);
  assert.match(controller, /visibilitychange/);
  assert.match(controller, /pageshow/);
  assert.match(controller, /state.phase !== 'ready'/);
  assert.match(controller, /provider === originalProviders.get\(provider.id\)/);
  assert.match(read('src/App.tsx'), /<AppError/);
});
test('snapshot and native setup never synchronously access secure storage', () => {
  const rust = read('src-tauri/src/lib.rs');
  const snapshot = rust.slice(
    rust.indexOf('async fn get_app_snapshot'),
    rust.indexOf('async fn refresh_provider_secret_presence'),
  );
  assert.match(snapshot, /spawn_blocking/);
  assert.doesNotMatch(snapshot, /secure_storage::/);
  const setup = rust.slice(
    rust.indexOf('.setup('),
    rust.indexOf('.invoke_handler('),
  );
  assert.doesNotMatch(setup, /secure_storage::initialize/);
  const reconcile = rust.slice(
    rust.indexOf('async fn refresh_provider_secret_presence'),
    rust.indexOf('fn get_usage_history'),
  );
  assert.match(reconcile, /spawn_blocking/);
  assert.match(reconcile, /compare_exchange/);
  assert.match(
    reconcile,
    /let ids = \{[\s\S]*?db::unknown_provider_secret_ids\(&database\)\?\s*\};/,
  );
  assert.match(reconcile, /has_secret IS NULL/);
});
test('advanced provider fields reuse project selectors, switches and surfaces without custom menus', () => {
  const source = read(
    'src/features/telescope/components/ProviderAdvancedSettings.tsx',
  );
  assert.match(source, /<Select/);
  assert.match(source, /<Select.Popover>/);
  assert.match(source, /<ListBox.Item/);
  assert.match(source, /<SettingSwitchRow/);
  assert.match(source, /<AppPanel/);
  assert.match(source, /<SectionHeader/);
  assert.doesNotMatch(
    source,
    /<select|type="checkbox"|<details|const controlClass/,
  );
  assert.match(source, /min-w-0 max-w-full/);
  const editor = read(
    'src/features/telescope/components/ProviderEditorModal.tsx',
  );
  const details = editor.slice(
    editor.indexOf('<details'),
    editor.indexOf('</details>'),
  );
  assert.match(details, /<GenerationSettings/);
  assert.match(details, /<ProviderAdvancedSettings/);
});
