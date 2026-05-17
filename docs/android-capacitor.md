# Android APK Setup

Capacitor has been added without changing the normal website flow.

## Commands

```bash
npm run cap:sync
npm run android:build
```

The debug APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Live Website Mode

If you want the APK to load the deployed website so site updates appear in the app immediately, set `CAPACITOR_SERVER_URL` before syncing:

```powershell
$env:CAPACITOR_SERVER_URL="https://your-site.vercel.app"
npm run cap:sync
npm run android:build
```

If `CAPACITOR_SERVER_URL` is not set, Capacitor bundles the current `public` files into the APK.

## Google Login In APK

The APK uses this native OAuth callback URL:

```text
com.buddyai.lively://login
```

Add that URL to your Supabase project's allowed redirect URLs. The regular website URL should also stay allowed:

```text
https://project-lively.vercel.app/login.html
```

After changing login code, deploy the website first, then rebuild the APK in live website mode.

## Build Requirement

Android builds require Java/JDK and Android tooling. If `android:build` says `JAVA_HOME is not set`, install Android Studio or a JDK, then set `JAVA_HOME`.
