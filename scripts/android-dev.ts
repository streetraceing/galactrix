import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

function resolveAdbCommand() {
  const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (sdkRoot) {
    const executable = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const sdkAdb = path.join(sdkRoot, 'platform-tools', executable);
    if (existsSync(sdkAdb)) return sdkAdb;
  }
  return 'adb';
}

function run(command: string, args: string[], stdio: 'ignore' | 'inherit') {
  const result = spawnSync(command, args, { stdio });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function main() {
  const adb = resolveAdbCommand();
  if (run(adb, ['get-state'], 'ignore') !== 0) {
    console.error('No Android device is connected through adb.');
    return 1;
  }

  for (const port of ['1420', '1421']) {
    const code = run(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], 'inherit');
    if (code !== 0) return code;
  }

  const tauriCli = require.resolve('@tauri-apps/cli/tauri.js');
  const result = spawnSync(
    process.execPath,
    [tauriCli, 'android', 'dev', '--host', '127.0.0.1'],
    {
      stdio: 'inherit',
      env: { ...process.env, TAURI_DEV_HOST: '127.0.0.1' },
    },
  );
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
