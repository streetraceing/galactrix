# Releasing Galactrix

Galactrix keeps one application version synchronized across npm, Cargo and Tauri. `package.json` is the source used by the helper script, while `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `src-tauri/tauri.conf.json` are updated together.

## Version commands

```bash
npm run version:check
npm run version:sync
npm run version:set -- 1.2.3
npm run version:patch
npm run version:minor
npm run version:major
npm run release:prepare:patch
npm run release:prepare:minor
npm run release:prepare:major
npm run release:tag
```

The `release:prepare:*` shortcuts bump the requested part and immediately run the normal project checks. `version:check` is also part of CI and the release workflow. The explicit `tauri.conf.json` version is intentional: Tauri recommends it as the app version source and Android derives `versionCode` from it.

## Local builds

```bash
npm run tauri:build:desktop
npm run tauri:build:android
npm run tauri:build:android:apk
npm run tauri:build:all
npm run release:build:local
```

`release:build:local` verifies synchronized versions and project checks, then builds the current desktop platform and Android. Android still requires the normal Android SDK/NDK environment.

## GitHub Release

After committing the version bump, run `npm run release:tag`. It refuses to tag a dirty working tree and creates the matching annotated `vX.Y.Z` tag. Then publish it explicitly with `git push origin vX.Y.Z`. Pushing that tag runs `.github/workflows/release.yml`. The workflow builds Linux, Windows, macOS and a signed Android APK/AAB, then uploads them to one GitHub Release. It can also be started manually; in that case the release tag is derived from `package.json`.

Android release signing uses these GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded `.jks`/`.keystore` file.
- `ANDROID_KEY_ALIAS` — signing key alias.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_PASSWORD` — key password; optional when it matches the keystore password.

The Android Gradle project also remains compatible with the existing local `src-tauri/gen/android/keystore.properties` file. Release signing environment variables take precedence when present.

## Android CI

CI intentionally runs a real Tauri Android debug APK build instead of `cargo ndk check`. Tauri mobile builds configure Rust/NDK details and then exercise the Gradle, JNI and bundled Android integration used by the application. This catches more relevant failures and avoids false failures caused by compiling the Tauri library outside its mobile build pipeline.
