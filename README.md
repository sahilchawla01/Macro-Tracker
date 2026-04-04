# Macro Tracker

Expo (SDK 54) + React Native nutrition app: onboarding, daily dashboard (macros, water, saved meals), SQLite storage, profile and JSON export/import.

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- For **on-device dev**: [Expo Go](https://expo.dev/go) on a phone, or an emulator/simulator
- For **cloud Android builds**: a free [Expo](https://expo.dev) account
- For **local Android builds**: [Android Studio](https://developer.android.com/studio) with Android SDK

## Install

```bash
npm install
```

## Run locally (development)

```bash
npm start
```

Then press **a** (Android), **i** (iOS), or **w** (web), or scan the QR code in Expo Go.

Convenience scripts:

| Command | Description |
|--------|-------------|
| `npm run android` | Start dev server and open Android |
| `npm run ios` | Start dev server and open iOS (macOS) |
| `npm run web` | Web / `npm run desktop` |

First launch runs onboarding; data lives in SQLite on the device.

## Test

Unit tests use **Jest** (`jest-expo` preset). Nutrition math and repository helpers are covered under `src/**/*.test.ts`.

```bash
npm test
```

Optional typecheck (no emit):

```bash
npx tsc --noEmit
```

## Build for Android

### Option A — EAS Build (recommended for APK sideload)

Uses [EAS Build](https://docs.expo.dev/build/introduction/) in the cloud. `eas-cli` is included as a dev dependency.

1. Log in (once): `npx eas login`
2. Link the project (once): `npx eas init` — follow prompts so the app is registered on Expo
3. Build a **sideloadable APK** (profile `preview` in `eas.json`):

   ```bash
   npm run build:android:apk
   ```

   Equivalent: `npx eas build --platform android --profile preview`

4. When the build finishes, open the link from the terminal or [expo.dev](https://expo.dev) → your project → **Builds**, and download the **`.apk`**.

On the phone, allow install from your file/browser app if prompted (“unknown sources”).

**Other profiles** (see `eas.json`):

- **`development`** — development client APK (not a standalone store-style app)
- **`production`** — Android **App Bundle** (`.aab`) for Google Play

**Play Store:** after a production build, use `npx eas submit --platform android` (requires Play Console setup).

### Option B — Android Studio (local native project)

Native folders are **not** committed (`android/` is gitignored). Generate them, then build in Android Studio.

1. Generate `android/`:

   ```bash
   npx expo prebuild --platform android
   ```

2. Open the **`android`** folder in Android Studio (not the repo root).

3. **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or run on a device/emulator).

Regenerate after native or config/plugin changes; use `npx expo prebuild --platform android --clean` if you need a clean slate (re-check any manual edits under `android/`).

**CLI alternative** (same native project): `npx expo run:android`

## Project layout (high level)

- `app/` — Expo Router screens (tabs, onboarding)
- `src/db/` — SQLite schema, migrations, repository
- `src/nutrition/` — BMR/TDEE/macros/water calculations
- `src/components/` — UI (retro theme)
- `jest.config.js` — Jest / `jest-expo`

## License

Private project (`"private": true` in `package.json`).
