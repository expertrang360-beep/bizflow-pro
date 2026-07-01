# Native Mobile App (iOS & Android)

BizFlow ships with **Capacitor** so the same codebase runs as a real native app on the App Store and Google Play.

## What's included

- `capacitor.config.ts` — app id, name, splash, status bar, keyboard config
- `src/lib/native.ts` — safe helpers (`isNative`, `hapticTap`, `shareContent`, `nativeStorage`, `getNetworkStatus`) — no-ops on web
- Plugins installed: **App, StatusBar, SplashScreen, Keyboard, Haptics, Network, Share, Preferences**
- Boot hook in `src/main.tsx` (`initNative()`) — hides splash, styles status bar, wires Android back button, tracks keyboard open/close (`body.kb-open`)
- Hot-reload during development points the native shell at the Lovable preview URL, so edits show up instantly on device.

## One-time setup on your machine

Requires: Node 20+, Xcode (for iOS, macOS only) and/or Android Studio (for Android).

```bash
# 1. Push to GitHub via the "Export to Github" button in Lovable, then clone locally.
git clone <your-repo> && cd <your-repo>
npm install

# 2. Add platforms (do this once — creates ios/ and android/ folders)
npx cap add ios
npx cap add android

# 3. Build web assets and copy into native projects
npm run build
npx cap sync

# 4. Run
npx cap run ios       # opens iOS simulator (needs Xcode)
npx cap run android   # opens Android emulator (needs Android Studio)
```

## After every git pull

```bash
npm install
npm run build
npx cap sync
```

`cap sync` copies `dist/` into the native shells and updates plugins. Skip it and native builds run stale code.

## Going to production (App Store / Play Store)

Before you build a release binary, **remove the dev hot-reload server block** in `capacitor.config.ts` so the app loads its bundled `dist/` instead of the Lovable preview:

```ts
// capacitor.config.ts — for production, delete or comment out:
// server: { url: '...', cleartext: true },
```

Then:

```bash
npm run build && npx cap sync
npx cap open ios      # archive & upload from Xcode
npx cap open android  # generate signed AAB from Android Studio
```

## Using native features in your code

```tsx
import { hapticTap, shareContent, isNative } from "@/lib/native";

<Button onClick={async () => {
  await hapticTap("medium");
  await shareContent({ title: "Receipt", url: receiptUrl });
}}>Share</Button>

{isNative() && <NativeOnlyBanner />}
```

All helpers degrade gracefully on the web build — no `if` guards needed at call sites.

## Reference

Full walkthrough: https://lovable.dev/blog/how-to-build-a-mobile-app-with-lovable
