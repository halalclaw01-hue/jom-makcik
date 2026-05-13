# Backend API

Backend API foundation for the Jom Makcik CareRide MVP.

This phase includes only:

- Basic Express server
- `GET /health` health check
- Authentication endpoints
- Role guard middleware
- Request logging middleware
- Safe error handling middleware
- Environment config example
- Local SQLite database setup scripts

It does not include booking logic, payment logic, rider assignment, chat, or reports yet.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, you can copy it with:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `.env` before using authentication routes. Use a long random local value.

Start the backend:

```bash
npm run dev
```

The default local URL is:

```text
http://localhost:4000
```

## Health Check

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "jom-makcik-careride-backend"
}
```

## Local Database

The MVP uses SQLite for local development.

Create or update the local database:

```bash
npm run db:setup
```

Reset the local database for testing:

```bash
npm run db:reset
```

Verify the local database tables and seed counts:

```bash
npm run db:verify
```

The default database path is:

```text
./data/jom-makcik.sqlite
```

You can change it with `DATABASE_PATH` in `.env`.

## Local Seed Users

The seed script creates development-only test users:

- Super admin: `superadmin@jommakcik.local`
- Passenger: `passenger@jommakcik.local`
- Rider pending approval: `rider@jommakcik.local`

All seed users use this local development password:

```text
Password123!
```

Passwords are stored as hashes in the database.

## Authentication

Login:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"passenger@jommakcik.local\",\"password\":\"Password123!\"}"
```

Get current user:

```bash
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Register passenger:

```bash
curl -X POST http://localhost:4000/auth/register/passenger \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Passenger Name\",\"phone\":\"+60123334444\",\"email\":\"passenger2@example.com\",\"password\":\"Password123!\",\"emergencyContactName\":\"Family Contact\",\"emergencyContactPhone\":\"+60129998888\"}"
```

Register rider:

```bash
curl -X POST http://localhost:4000/auth/register/rider \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Rider Name\",\"phone\":\"+60125556666\",\"email\":\"rider2@example.com\",\"password\":\"Password123!\",\"icNumber\":\"900101-10-2222\",\"licenseNumber\":\"D7654321\",\"vehicleModel\":\"Perodua Bezza\",\"vehiclePlate\":\"JMC5678\"}"
```

Manual role-check endpoints:

- `GET /auth/role-check/passenger`
- `GET /auth/role-check/rider`
- `GET /auth/role-check/admin`
- `GET /auth/role-check/super-admin`

Each role-check endpoint requires `Authorization: Bearer YOUR_TOKEN`.

## Passenger Bookings

Create a quoted booking:

```bash
curl -X POST http://localhost:4000/passenger/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN" \
  -d "{\"passengerCategory\":\"senior\",\"serviceType\":\"medical_appointment\",\"pickupAddress\":\"Taman Melati, Kuala Lumpur\",\"destinationAddress\":\"Hospital Kuala Lumpur\",\"pickupDatetime\":\"2026-05-20T10:00:00.000Z\",\"needsChaperone\":true,\"specialNotes\":\"Bring wheelchair\"}"
```

The fare is calculated using MVP placeholder quote logic:

- Fixed base fare
- Fixed distance placeholder
- Service type adjustment
- Optional chaperone adjustment

List own bookings:

```bash
curl http://localhost:4000/passenger/bookings \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN"
```

View own booking detail:

```bash
curl http://localhost:4000/passenger/bookings/1 \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN"
```

Confirm a quoted booking:

```bash
curl -X POST http://localhost:4000/passenger/bookings/1/confirm \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN"
```
