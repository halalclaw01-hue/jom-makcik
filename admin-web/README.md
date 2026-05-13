# Jom Makcik Control Centre

Admin web dashboard shell for the Jom Makcik CareRide MVP.

## Current Scope

This phase includes:

- Admin login page
- Protected admin route shell
- Dashboard layout with sidebar, top bar, and content area
- Pages for Dashboard, Bookings, Riders, Passengers, Payments, Matching, Chat Monitor, Care Reports, and Reports
- Real backend API calls where endpoints already exist
- Empty or unavailable states where backend APIs are not ready

No fake booking, rider, payment, chat, report, or chart data is shown.

## Setup

Install dependencies:

```bash
npm install
```

Copy environment example:

```powershell
Copy-Item .env.example .env
```

Start the backend first from `../backend`, then start the admin web app:

```bash
npm run dev
```

Default API URL:

```text
http://localhost:4000
```

## Login

Use the local seed super admin after running backend database setup/reset:

```text
superadmin@jommakcik.local
Password123!
```
