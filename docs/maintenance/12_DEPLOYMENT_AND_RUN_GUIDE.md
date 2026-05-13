# Deployment and Run Guide

This guide is for local development. Production deployment is not implemented yet / future phase.

## Local Development Startup Checklist

1. Install Node.js.
2. Install dependencies.
3. Set up `.env`.
4. Start backend.
5. Start passenger app.
6. Start rider app.
7. Start admin app.
8. Start admin web.

## Backend

```bash
cd backend
npm install
npm run dev
```

Backend usually runs at:

```text
http://localhost:4000
```

Useful setup commands:

```bash
npm run db:reset
npm run db:verify
```

## Admin Web

```bash
cd admin-web
npm install
npm run dev
```

Open the URL shown in the terminal. It is usually:

```text
http://localhost:5173
```

## Passenger App

```bash
cd passenger-app
npm install
npm run start
```

## Rider App

```bash
cd rider-app
npm install
npm run start
```

## Admin App

```bash
cd admin-app
npm install
npm run start
```

## Android API URL Notes

For Android emulator, apps usually call:

```text
http://10.0.2.2:4000
```

For a real Android phone, use the computer's local WiFi IP, for example:

```text
http://192.168.x.x:4000
```

## Seed Login

Local seed admin:

```text
Email: superadmin@jommakcik.local
Password: Password123!
```

## Not Implemented Yet / Future Phase

- Production hosting.
- CI/CD deployment.
- App store release.
- Real payment gateway.
- Production file storage.

## Maintenance Warning

Actual commands may differ depending on framework used. Update this file whenever startup command changes.
