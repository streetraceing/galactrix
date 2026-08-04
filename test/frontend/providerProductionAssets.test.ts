import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const providerLogoPath = new URL(
  '../../src/components/ui/ProviderLogo.tsx',
  import.meta.url,
);
const gradlePath = new URL(
  '../../src-tauri/gen/android/app/build.gradle.kts',
  import.meta.url,
);
const proguardPath = new URL(
  '../../src-tauri/gen/android/app/proguard-rules.pro',
  import.meta.url,
);

const localAssets = [
  'mistral-ai.svg',
  'cerebras.svg',
  'nvidia.svg',
  'google-gemini.svg',
  'groq.svg',
  'openrouter.svg',
  'hugging-face.svg',
  'ollama.svg',
  'cloudflare.svg',
];

test('provider logos are bundled locally and stay lightweight', async () => {
  const source = await readFile(providerLogoPath, 'utf8');

  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(source, /\/provider-logos\/mistral-ai\.svg/);
  assert.match(source, /\/provider-logos\/cerebras\.svg/);
  assert.match(source, /\/provider-logos\/groq\.svg/);

  await Promise.all(
    localAssets.map(async (fileName) => {
      const file = new URL(`public/provider-logos/${fileName}`, root);
      const metadata = await stat(file);
      assert.ok(metadata.size > 0, `${fileName} must not be empty`);
      assert.ok(
        metadata.size < 12_000,
        `${fileName} should remain below 12 KB, got ${metadata.size}`,
      );
    }),
  );
});

test('Android release preserves the TLS JNI bridge and custom HTTP endpoints', async () => {
  const [gradle, proguard] = await Promise.all([
    readFile(gradlePath, 'utf8'),
    readFile(proguardPath, 'utf8'),
  ]);

  assert.match(
    gradle,
    /getByName\("release"\)[\s\S]*?usesCleartextTraffic"\] = "true"/,
  );
  assert.match(
    proguard,
    /-keep class ru\.streetraceing\.galactrix\.MainActivity \{ \*; \}/,
  );
  assert.doesNotMatch(
    proguard,
    /-keepclassmembers class ru\.streetraceing\.galactrix\.MainActivity/,
  );
});
