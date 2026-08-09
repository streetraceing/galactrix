import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  bumpVersion,
  parseVersion,
  releaseCommitMessage,
} from '../../scripts/version.ts';

const execFileAsync = promisify(execFile);
const root = new URL('../../', import.meta.url);

test('version helpers increment semantic versions predictably', () => {
  assert.deepEqual(parseVersion('1.2.3'), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: '',
    build: '',
  });
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(releaseCommitMessage('1.2.3'), '1.2.3');
});

test('project versions stay synchronized', async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', 'scripts/version.ts', 'check'],
    {
      cwd: root,
    },
  );
  assert.match(stdout, /is synchronized across npm, Cargo and Tauri config/);
});

test('Android CI exercises the Tauri mobile build instead of raw cargo-ndk', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /android-rust:/);
  assert.match(workflow, /tauri:build:android:ci/);
  assert.match(workflow, /NDK_HOME=/);
  assert.match(workflow, /NDK_VERSION: 28\.1\.13356709/);
  assert.doesNotMatch(workflow, /cargo ndk/);
});

test('release helpers expose combined local builds and a safe annotated tag command', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const versionScript = await readFile(
    new URL('../../scripts/version.ts', import.meta.url),
    'utf8',
  );
  assert.equal(
    packageJson.scripts['tauri:build:all'],
    'npm run tauri:build:desktop && npm run tauri:build:android',
  );
  assert.equal(
    packageJson.scripts['release:tag'],
    'tsx scripts/version.ts tag',
  );
  assert.equal(
    packageJson.scripts['release:push'],
    'tsx scripts/version.ts commit && npm run release:tag',
  );
  assert.match(versionScript, /git', \['status', '--porcelain'\]/);
  assert.match(versionScript, /git', \['add', '--all'\]/);
  assert.match(versionScript, /git', \['commit', '-m'/);
  assert.match(versionScript, /previousVersion === version/);
  assert.match(versionScript, /git', \['tag', '-a'/);
});

test('project-owned automation uses TypeScript entrypoints through tsx', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const scriptFiles = await readdir(new URL('../../scripts/', import.meta.url));

  assert.deepEqual(scriptFiles.sort(), [
    'android-dev.ts',
    'check-i18n.ts',
    'version.ts',
  ]);

  for (const scriptName of [
    'i18n:check',
    'tauri:dev:android',
    'version:check',
    'version:sync',
    'version:set',
    'version:patch',
    'version:minor',
    'version:major',
    'release:tag',
    'release:push',
  ]) {
    assert.match(
      packageJson.scripts[scriptName],
      /^tsx scripts\/.+\.ts(?: |$)/,
    );
  }

  const androidScript = await readFile(
    new URL('../../scripts/android-dev.ts', import.meta.url),
    'utf8',
  );
  assert.match(
    androidScript,
    /require\.resolve\('@tauri-apps\/cli\/tauri\.js'\)/,
  );
  assert.match(androidScript, /ANDROID_HOME/);
});

test('release workflow builds desktop and signed Android artifacts', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/release.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /tauri-apps\/tauri-action@v0\.6\.2/);
  assert.match(workflow, /Build signed Android APK and AAB/);
  assert.match(workflow, /npm run tauri:build:android --/);
  assert.match(workflow, /--apk --aab --ci/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /ANDROID_KEYSTORE_BASE64/);
});

test('Android signing supports CI secrets without breaking local keystore properties', async () => {
  const gradle = await readFile(
    new URL(
      '../../src-tauri/gen/android/app/build.gradle.kts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(gradle, /System\.getenv\("ANDROID_KEYSTORE_PATH"\)/);
  assert.match(gradle, /System\.getenv\("ANDROID_KEYSTORE_PASSWORD"\)/);
  assert.match(
    gradle,
    /if \(hasReleaseSigning\) \{[\s\S]*?signingConfig = signingConfigs\.getByName\("release"\)/,
  );
  assert.match(gradle, /rootProject\.file\("keystore\.properties"\)/);
});
