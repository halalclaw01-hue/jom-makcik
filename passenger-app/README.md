# Jom Makcik CareRide Passenger App

Expo React Native foundation for the Passenger Android app.

## Local setup

```bash
npm install
npm run android
```

The default API base URL is `http://10.0.2.2:4000`, which points an Android emulator to the host machine backend.

For a physical Android phone on the same network, set the API host in `app.json` to your computer LAN IP before starting Expo.

## Current Phase

Phase 20 creates the app shell, screens, navigation, API client, token storage, and real backend login/register calls only.
