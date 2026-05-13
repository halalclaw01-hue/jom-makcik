# Project Folder Structure Reference

Before changing code, identify which folder is affected. This helps avoid editing the wrong app or changing unrelated working code.

| Folder | Purpose | Important Notes |
| --- | --- | --- |
| `/backend` | Backend API, business rules, authentication, database access, booking state machine, reports, audit logs. | Change this only when API behavior, validation, database access, or security rules need updates. |
| `/passenger-app` | Passenger Android app. | Used by passengers to create bookings, pay by proof, view booking status, and chat. |
| `/rider-app` | Rider Android app. | Used by approved riders to manage availability, job offers, trips, chat, and care reports. |
| `/admin-app` | Admin Android app. | Light mobile admin app for urgent monitoring and actions. |
| `/admin-web` | Admin Web Dashboard, called Jom Makcik Control Centre. | Main admin workspace for bookings, payments, riders, matching, chat, reports, and audit logs. |
| `/shared` | Shared project space for common future code or references. | Use only when a shared item is truly needed by more than one app. |
| `/docs` | General project documentation. | Includes project scope, rules, test reports, and generated prompt references. |
| `/docs/maintenance` | Maintenance documentation for repair, updates, and handover. | Read these files before future fixes or feature updates. |

## Maintenance Rule

Do not guess where a change belongs. First identify whether the issue is in:

- Backend API.
- Database.
- Passenger app.
- Rider app.
- Admin app.
- Admin web.
- Documentation only.

Then change only the affected folder.
