# APK Builder Prompt — Jom Makcik CareRide

You are building APKs for three Expo (SDK 52) Android apps in a monorepo. The apps are complete working code — do NOT rewrite them.

## Project Location

```
/mnt/c/Users/abdul/OneDrive/Documents/New project 10/
```

## Repository

- Public: `https://github.com/halalclaw01-hue/jom-makcik` (branch: master)
- Private: `https://github.com/halalclaw01-hue/jom-makcik-careride` (branch: master)

## Backend (Deployed on Coolify / Hostinger VPS)

```
API URL: http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io
Health:  http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io/health → {"status":"ok"}
Auth:    POST /auth/login with {"identifier":"superadmin@jommakcik.local","password":"Password123!"}
```

## Three Apps to Build

| App | Directory | Package Name Suggestion | API Client File | App.js Size |
|-----|-----------|------------------------|-----------------|-------------|
| Passenger | `passenger-app/` | `com.jommakcik.passenger` | `src/api/client.js` | ~1200 lines |
| Rider | `rider-app/` | `com.jommakcik.rider` | `src/api/client.js` | ~1000 lines |
| Admin | `admin-app/` | `com.jommakcik.admin` | `src/api/client.js` | ~1250 lines |

## Build Steps (per app, in order)

### 1. Set the API URL

Each app has a hardcoded default of `http://10.0.2.2:4000` (Android emulator). For real APKs, it must point to the production backend. The recommended approach: create a `.env` file in each app directory:

```
echo 'EXPO_PUBLIC_API_BASE_URL=http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io' > passenger-app/.env
echo 'EXPO_PUBLIC_API_BASE_URL=http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io' > rider-app/.env
echo 'EXPO_PUBLIC_API_BASE_URL=http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io' > admin-app/.env
```

DO NOT commit `.env` files — they're already in `.gitignore`.

### 2. Install Dependencies

```bash
cd passenger-app && npm install && cd ..
cd rider-app && npm install && cd ..
cd admin-app && npm install && cd ..
```

If `npm install` fails, try `npm install --legacy-peer-deps`.

### 3. Verify Apps Run (optional but recommended)

```bash
cd passenger-app && npx expo start --web  # exits with Ctrl+C
```

### 4. Configure EAS Build (per app)

You need an Expo account. If none exists, create one at https://expo.dev.

```bash
# Login to Expo (once)
npx eas login

# For EACH app:
cd passenger-app
npx eas build:configure  # creates eas.json, select "Android" when prompted
cd ../rider-app
npx eas build:configure
cd ../admin-app
npx eas build:configure
```

### 5. Update eas.json for each app

Replace the default `eas.json` in each app directory with:

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "env": {
          "EXPO_PUBLIC_API_BASE_URL": "http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io"
        }
      }
    }
  }
}
```

### 6. Update app.json for each app

Each app has an `app.json`. Update the following fields with unique values:

**passenger-app/app.json:**
```json
{
  "expo": {
    "name": "Jom Makcik CareRide",
    "slug": "jom-makcik-careride-passenger",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.jommakcik.passenger",
      "adaptiveIcon": {
        "backgroundColor": "#fff7fc"
      }
    }
  }
}
```

**rider-app/app.json:**
```json
{
  "expo": {
    "name": "Jom Makcik Rider",
    "slug": "jom-makcik-rider",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.jommakcik.rider",
      "adaptiveIcon": {
        "backgroundColor": "#fff7fc"
      }
    }
  }
}
```

**admin-app/app.json:**
```json
{
  "expo": {
    "name": "Jom Makcik Admin",
    "slug": "jom-makcik-admin",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.jommakcik.admin",
      "adaptiveIcon": {
        "backgroundColor": "#fff7fc"
      }
    }
  }
}
```

### 7. Build APKs (per app)

```bash
cd passenger-app && npx eas build --platform android --profile production --local
```

This produces the APK locally (requires Android SDK / JDK 17). If local build isn't possible, use cloud build:

```bash
npx eas build --platform android --profile production
```

Repeat for `rider-app` and `admin-app`.

APK output location (local): each app directory, Expo prints the path.
APK output location (cloud): Expo dashboard → download from build page.

### 8. After Build — Commit Config

Commit the app.json changes and eas.json to the repo:

```bash
cd /mnt/c/Users/abdul/OneDrive/Documents/New project 10/
git add passenger-app/app.json passenger-app/eas.json
git add rider-app/app.json rider-app/eas.json
git add admin-app/app.json admin-app/eas.json
git add passenger-app/.env.example rider-app/.env.example admin-app/.env.example
git commit -m "chore: configure Expo EAS Build for APK generation"
git push origin master
git push public master
```

## Safety Rules

- Do NOT commit `.env` files
- Do NOT commit `android/` or `ios/` directories (Expo managed workflow)
- Do NOT rewrite App.js or any source files
- Do NOT change the API client logic
- Do NOT change package names already configured
- Only modify: `app.json`, `eas.json`, `.env` (gitignored)
- Test login flow after build by installing APK on a device

## Post-Build Verification

After installing each APK on an Android device:
1. Open the app → login screen should appear
2. Passenger: login with `superadmin@jommakcik.local` / `Password123!` → should redirect (admin role detected — fix: create a passenger account)
3. Test actual passenger/rider flows with seeded test accounts from the backend
4. Verify network calls hit the Coolify backend (not emulator 10.0.2.2)

## Notes

- The apps are Expo managed workflow — no native Android project directories exist
- EAS Build handles all native compilation
- Each app currently uses `http://` (not HTTPS) — for production, consider HTTPS with a proper domain
- The `.env` files with `EXPO_PUBLIC_*` prefix are embedded at build time
- If builds fail due to missing assets (icon.png, splash.png), create placeholder PNG images
