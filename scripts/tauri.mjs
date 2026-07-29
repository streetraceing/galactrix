import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { delimiter, dirname, join, resolve } from 'node:path';

const tauriArgs = process.argv.slice(2);
const environment = { ...process.env };
environment.PATH = `${dirname(process.execPath)}${delimiter}${environment.PATH || ''}`;

function configureCargo() {
  const executable = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
  const candidates = [
    environment.CARGO,
    environment.CARGO_HOME && join(environment.CARGO_HOME, 'bin', executable),
    environment.USERPROFILE &&
      join(environment.USERPROFILE, '.cargo', 'bin', executable),
    environment.HOME && join(environment.HOME, '.cargo', 'bin', executable),
  ].filter(Boolean);

  const cargoExecutable = candidates.find((candidate) => existsSync(candidate));
  if (!cargoExecutable) {
    return;
  }

  environment.CARGO = cargoExecutable;
  environment.PATH = `${dirname(cargoExecutable)}${delimiter}${environment.PATH || ''}`;
}

function findNdkHome() {
  if (environment.NDK_HOME && existsSync(environment.NDK_HOME)) {
    return environment.NDK_HOME;
  }

  const sdkHome = environment.ANDROID_HOME || environment.ANDROID_SDK_ROOT;
  const ndkDirectory = sdkHome && join(sdkHome, 'ndk');
  if (!ndkDirectory || !existsSync(ndkDirectory)) {
    return undefined;
  }

  const versions = readdirSync(ndkDirectory)
    .filter((name) =>
      existsSync(join(ndkDirectory, name, 'toolchains', 'llvm', 'prebuilt')),
    )
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true }),
    );

  return versions[0] && join(ndkDirectory, versions[0]);
}

function configureAndroidToolchain() {
  const ndkHome = findNdkHome();
  if (!ndkHome) {
    return;
  }

  const prebuiltDirectory = join(ndkHome, 'toolchains', 'llvm', 'prebuilt');
  if (!existsSync(prebuiltDirectory)) {
    return;
  }

  const hostDirectory = readdirSync(prebuiltDirectory).find((directory) =>
    existsSync(join(prebuiltDirectory, directory, 'bin')),
  );
  if (!hostDirectory) {
    return;
  }

  const toolchainBin = join(prebuiltDirectory, hostDirectory, 'bin');

  const executableSuffix = process.platform === 'win32' ? '.cmd' : '';
  const targets = [
    ['AARCH64_LINUX_ANDROID', 'aarch64-linux-android24-clang'],
    ['ARMV7_LINUX_ANDROIDEABI', 'armv7a-linux-androideabi24-clang'],
    ['I686_LINUX_ANDROID', 'i686-linux-android24-clang'],
    ['X86_64_LINUX_ANDROID', 'x86_64-linux-android24-clang'],
  ];

  for (const [environmentName, compiler] of targets) {
    const cCompiler = join(toolchainBin, `${compiler}${executableSuffix}`);
    const cppCompiler = join(toolchainBin, `${compiler}++${executableSuffix}`);

    if (!existsSync(cCompiler) || !existsSync(cppCompiler)) {
      continue;
    }

    environment[`CARGO_TARGET_${environmentName}_LINKER`] = cCompiler;
    environment[`CC_${environmentName.toLowerCase()}`] = cCompiler;
    environment[`CXX_${environmentName.toLowerCase()}`] = cppCompiler;
    environment[`AR_${environmentName.toLowerCase()}`] = join(
      toolchainBin,
      process.platform === 'win32' ? 'llvm-ar.exe' : 'llvm-ar',
    );
  }

  environment.PATH = `${toolchainBin}${delimiter}${environment.PATH || ''}`;
}

configureCargo();

if (tauriArgs[0] === 'android') {
  configureAndroidToolchain();
}

const tauriBinary = resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tauri.cmd' : 'tauri',
);
const result = spawnSync(tauriBinary, tauriArgs, {
  env: environment,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
