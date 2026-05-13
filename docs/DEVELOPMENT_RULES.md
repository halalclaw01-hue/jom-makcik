# Development Rules

## Work Scope

- Do not build everything all at once.
- Work one phase at a time.
- Work one small task at a time.
- Stop and report after each task or phase when requested.
- Do not refactor unrelated files.
- Do not delete existing working code unless instructed.
- Do not invent future features.

## Security

- Protect authentication.
- Do not bypass login or role checks.
- Do not hardcode secret keys.
- Do not expose secret keys or private API keys in frontend code.

## Roles And Access

- Protect roles.
- Passengers must only access their own protected data.
- Riders must only access approved rider workflows and assigned booking data.
- Admin actions must require an admin or super admin role.
- Super admin behavior must not be invented beyond the approved MVP scope.

## Booking Validation

- Validate booking status changes in the backend.
- Do not rely only on frontend validation.
- Only allow approved booking status transitions.
- Do not allow forbidden transitions such as direct completion from draft, quoted, payment pending, paid, matching, cancelled, or refunded.

## Audit And Logging

- Log important actions.
- Important actions include login-sensitive operations, booking status changes, payment approval, rider approval, rider assignment, chat creation, cancellation, refund handling, and care report submission.
