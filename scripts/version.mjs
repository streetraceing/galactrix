import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parseVersion(value) {
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

export function bumpVersion(value, release) {
  const current = parseVersion(value);
  if (release === 'major') return `${current.major + 1}.0.0`;
  if (release === 'minor') return `${current.major}.${current.minor + 1}.0`;
  if (release === 'patch')
    return `${current.major}.${current.minor}.${current.patch + 1}`;
  throw new Error(`Unknown release type: ${release}`);
}

function replaceCargoPackageVersion(source, packageName, version) {
  const packageBlock = new RegExp(
    `(\\[\\[?package\\]?\\][\\s\\S]*?\\nname\\s*=\\s*"${packageName}"[\\s\\S]*?\\nversion\\s*=\\s*")([^"]+)(")`,
  );
  if (source.includes('[[package]]')) {
    if (!packageBlock.test(source))
      throw new Error(`Package ${packageName} not found in Cargo.lock`);
    return source.replace(packageBlock, `$1${version}$3`);
  }

  const packageSection = /(\[package\][\s\S]*?\nversion\s*=\s*")([^"]+)(")/;
  if (!packageSection.test(source))
    throw new Error('[package] version not found in Cargo.toml');
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

  const packageJson = JSON.parse(packageText);
  const packageLock = JSON.parse(lockText);
  const tauriConfig = JSON.parse(tauriText);
  const cargoTomlVersion = /\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/.exec(
    cargoToml,
  )?.[1];
  const cargoLockVersion =
    /\[\[package\]\][\s\S]*?\nname\s*=\s*"galactrix"[\s\S]*?\nversion\s*=\s*"([^"]+)"/.exec(
      cargoLock,
    )?.[1];

  return {
    packageText,
    lockText,
    cargoToml,
    cargoLock,
    tauriText,
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

async function writeVersion(version) {
  parseVersion(version);
  const state = await readState();

  state.packageJson.version = version;
  state.packageLock.version = version;
  if (state.packageLock.packages?.[''])
    state.packageLock.packages[''].version = version;
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

async function checkVersions() {
  const { versions } = await readState();
  const entries = Object.entries(versions);
  for (const [name, value] of entries) {
    if (!value) throw new Error(`Version is missing in ${name}`);
    parseVersion(value);
  }
  const expected = versions.packageJson;
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

function createReleaseTag(version) {
  const tag = `v${version}`;
  const dirty = execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
  }).trim();
  if (dirty) {
    throw new Error(
      'Working tree is not clean. Commit the version bump before creating a release tag.',
    );
  }

  try {
    execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`],
      {
        stdio: 'ignore',
      },
    );
    throw new Error(`Tag ${tag} already exists.`);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `Tag ${tag} already exists.`
    )
      throw error;
  }

  execFileSync('git', ['tag', '-a', tag, '-m', `Galactrix ${tag}`], {
    stdio: 'inherit',
  });
  console.log(`Created ${tag}. Publish it with: git push origin ${tag}`);
}

async function main() {
  const command = process.argv[2] ?? 'check';
  const current = JSON.parse(await readFile('package.json', 'utf8')).version;
  if (command === 'check') return checkVersions();
  if (command === 'sync') return writeVersion(current);
  if (command === 'tag') {
    const version = await checkVersions();
    return createReleaseTag(version);
  }
  if (command === 'set') {
    const version = process.argv[3];
    if (!version) throw new Error('Usage: npm run version:set -- <version>');
    return writeVersion(version);
  }
  if (['patch', 'minor', 'major'].includes(command)) {
    return writeVersion(bumpVersion(current, command));
  }
  throw new Error(`Unknown command: ${command}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
