# Role Permission Matrix

Use this matrix before changing permissions. `LIMITED` means the role can do the action only for its own data or under strict conditions.

| Function | Passenger | Rider | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| register | YES | YES | NO | NO |
| login | YES | YES | YES | YES |
| create booking | YES | NO | NO | NO |
| view own booking | YES | LIMITED | YES | YES |
| view all bookings | NO | NO | YES | YES |
| upload payment proof | YES | NO | NO | NO |
| approve payment | NO | NO | YES | YES |
| approve rider | NO | NO | YES | YES |
| receive job offer | NO | LIMITED | NO | NO |
| accept job | NO | LIMITED | NO | NO |
| reject job | NO | LIMITED | NO | NO |
| update trip status | NO | LIMITED | NO | NO |
| create care report | NO | LIMITED | NO | NO |
| view care report | LIMITED | LIMITED | YES | YES |
| monitor chat | NO | NO | YES | YES |
| send admin message | NO | NO | YES | YES |
| assign rider | NO | NO | YES | YES |
| cancel booking | NO | NO | YES | YES |
| mark refund pending | NO | NO | YES | YES |
| view reports | NO | NO | YES | YES |
| view audit logs | NO | NO | YES | YES |

## Permission Notes

- Passenger can view only their own bookings and own care reports.
- Rider can view and act only on assigned bookings or own job offers.
- Admin can manage bookings, riders, payments, chat, reports, and audit logs.
- Super Admin has the same MVP permissions as Admin.
- Future admin-user management is not implemented yet / future phase.

## Maintenance Warning

Never allow frontend-only role protection. Backend must also check role permission.
