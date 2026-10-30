import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

for (const workflow of ['ci.yml', 'release.yml']) {
  test(`${workflow} overrides the unavailable legacy Android tools package`, () => {
    const source = readFileSync(
      new URL(`../../.github/workflows/${workflow}`, import.meta.url),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const setupSteps = source.match(
      /^      - uses: android-actions\/setup-android@[^\n]+\n(?:(?!      - ).*\n)*/gm,
    );
    assert.ok(setupSteps?.length, 'Android setup step must be present');
    for (const step of setupSteps) {
      assert.match(step, /^        with:\s*$/m);
      assert.match(step, /^          packages: ['"]platform-tools['"]\s*$/m);
    }
    // The existing explicit installation still supplies the platform and NDK.
    assert.match(source, /"platforms;android-36"/);
    assert.match(source, /"build-tools;36\.0\.0"/);
    assert.match(source, /"ndk;\$NDK_VERSION"/);
  });
}
