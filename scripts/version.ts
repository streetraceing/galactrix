import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

type ReleaseType = 'major' | 'minor' | 'patch';

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  build: string;
};

type VersionedJson = {
  version?: string;
};

type PackageLockJson = VersionedJson & {
  packages?: Record<string, VersionedJson>;
};

export function parseVersion(value: string): ParsedVersion {
  const match = SEMVER.exec(value);
  if (!match) throw new Error(`Invalid SemVer version: ${value}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
    build: match[5] ?? '',
  };
}

export function bumpVersion(value: string, release: ReleaseType) {
  const current = parseVersion(value);
  if (release === 'major') return `${current.major + 1}.0.0`;
  if (release === 'minor') return `${current.major}.${current.minor + 1}.0`;
  return `${current.major}.${current.minor}.${current.patch + 1}`;
}

function parseJson<T>(source: string): T {
  return JSON.parse(source) as T;
}

function replaceCargoPackageVersion(
  source: string,
  packageName: string,
  version: string,
) {
  const packageBlock = new RegExp(
    `(\\[\\[?package\\]?\\][\\s\\S]*?\\nname\\s*=\\s*"${packageName}"[\\s\\S]*?\\nversion\\s*=\\s*")([^"]+)(")`,
  );
  if (source.includes('[[package]]')) {
    if (!packageBlock.test(source)) {
      throw new Error(`Package ${packageName} not found in Cargo.lock`);
    }
    return source.replace(packageBlock, `$1${version}$3`);
  }

  const packageSection = /(\[package\][\s\S]*?\nversion\s*=\s*")([^"]+)(")/;
  if (!packageSection.test(source)) {
    throw new Error('[package] version not found in Cargo.toml');
  }
  return source.replace(packageSection, `$1${version}$3`);
}

async function readState() {
  const [packageText, lockText, cargoToml, cargoLock, tauriText] =
    await Promise.all([
      readFile('package.json', 'utf8'),
      readFile('package-lock.json', 'utf8'),
      readFile('src-tauri/Cargo.toml', 'utf8'),
      readFile('src-tauri/Cargo.lock', 'utf8'),
      readFile('src-tauri/tauri.conf.json', 'utf8'),
    ]);

  const packageJson = parseJson<VersionedJson>(packageText);
  const packageLock = parseJson<PackageLockJson>(lockText);
  const tauriConfig = parseJson<VersionedJson>(tauriText);
  const cargoTomlVersion = /\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/.exec(
    cargoToml,
  )?.[1];
  const cargoLockVersion =
    /\[\[package\]\][\s\S]*?\nname\s*=\s*"galactrix"[\s\S]*?\nversion\s*=\s*"([^"]+)"/.exec(
      cargoLock,
    )?.[1];

  return {
    cargoToml,
    cargoLock,
    packageJson,
    packageLock,
    tauriConfig,
    versions: {
      packageJson: packageJson.version,
      packageLock: packageLock.version,
      packageLockRoot: packageLock.packages?.['']?.version,
      cargoToml: cargoTomlVersion,
      cargoLock: cargoLockVersion,
      tauriConfig: tauriConfig.version,
    },
  };
}

async function writeVersion(version: string) {
  parseVersion(version);
  const state = await readState();

  state.packageJson.version = version;
  state.packageLock.version = version;
  if (state.packageLock.packages?.['']) {
    state.packageLock.packages[''].version = version;
  }
  state.tauriConfig.version = version;

  await Promise.all([
    writeFile(
      'package.json',
      `${JSON.stringify(state.packageJson, null, 2)}\n`,
    ),
    writeFile(
      'package-lock.json',
      `${JSON.stringify(state.packageLock, null, 2)}\n`,
    ),
    writeFile(
      'src-tauri/Cargo.toml',
      replaceCargoPackageVersion(state.cargoToml, 'galactrix', version),
    ),
    writeFile(
      'src-tauri/Cargo.lock',
      replaceCargoPackageVersion(state.cargoLock, 'galactrix', version),
    ),
    writeFile(
      'src-tauri/tauri.conf.json',
      `${JSON.stringify(state.tauriConfig, null, 2)}\n`,
    ),
  ]);

  console.log(`Synced Galactrix version to ${version}`);
}

export async function checkVersions() {
  const { versions } = await readState();
  const entries = Object.entries(versions);
  for (const [name, value] of entries) {
    if (!value) throw new Error(`Version is missing in ${name}`);
    parseVersion(value);
  }
  const expected = versions.packageJson;
  if (!expected) throw new Error('Version is missing in packageJson');
  const mismatches = entries.filter(([, value]) => value !== expected);
  if (mismatches.length) {
    const details = entries
      .map(([name, value]) => `  ${name}: ${value}`)
      .join('\n');
    throw new Error(`Version mismatch. Run npm run version:sync.\n${details}`);
  }
  console.log(
    `Version ${expected} is synchronized across npm, Cargo and Tauri config.`,
  );
  return expected;
}

function assertReleaseTagAvailable(version: string) {
  const tag = `v${version}`;
  const result = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`],
    { stdio: 'ignore' },
  );
  if (result.error) throw result.error;
  if (result.status === 0) throw new Error(`Tag ${tag} already exists.`);
}

function workingTreeStatus() {
  return execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
  }).trim();
}

function headVersion() {
  const packageText = execFileSync('git', ['show', 'HEAD:package.json'], {
    encoding: 'utf8',
  });
  const version = parseJson<VersionedJson>(packageText).version;
  if (!version) throw new Error('Version is missing in HEAD:package.json');
  parseVersion(version);
  return version;
}

export function releaseCommitMessage(version: string) {
  parseVersion(version);
  return version;
}

function createReleaseCommit(version: string) {
  const previousVersion = headVersion();
  if (previousVersion === version) {
    throw new Error(
      `Version ${version} is already committed. Run release:prepare:patch, release:prepare:minor or release:prepare:major first.`,
    );
  }
  if (!workingTreeStatus()) {
    throw new Error(
      'Working tree is clean; there is no prepared release to commit.',
    );
  }
  assertReleaseTagAvailable(version);

  execFileSync('git', ['add', '--all'], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', releaseCommitMessage(version)], {
    stdio: 'inherit',
  });
  console.log(`Created release commit ${version}.`);
}

function createReleaseTag(version: string) {
  const tag = `v${version}`;
  if (workingTreeStatus()) {
    throw new Error(
      'Working tree is not clean. Commit the version bump before creating a release tag.',
    );
  }
  assertReleaseTagAvailable(version);

  execFileSync('git', ['tag', '-a', tag, '-m', `Galactrix ${tag}`], {
    stdio: 'inherit',
  });
  console.log(`Created ${tag}. Publish it with: git push origin ${tag}`);
}

async function main() {
  const command = process.argv[2] ?? 'check';
  const packageJson = parseJson<VersionedJson>(
    await readFile('package.json', 'utf8'),
  );
  const current = packageJson.version;
  if (!current) throw new Error('Version is missing in package.json');

  if (command === 'check') return checkVersions();
  if (command === 'sync') return writeVersion(current);
  if (command === 'tag') {
    const version = await checkVersions();
    return createReleaseTag(version);
  }
  if (command === 'commit') {
    const version = await checkVersions();
    return createReleaseCommit(version);
  }
  if (command === 'set') {
    const version = process.argv[3];
    if (!version) throw new Error('Usage: npm run version:set -- <version>');
    return writeVersion(version);
  }
  if (command === 'patch' || command === 'minor' || command === 'major') {
    return writeVersion(bumpVersion(current, command));
  }
  throw new Error(`Unknown command: ${command}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
