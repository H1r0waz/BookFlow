# Architecture

## Runtime

Vite/React/TypeScript serves the client in development and proxies `/api` to Express. Production Express serves the built client and API from the same origin. Prisma accesses PostgreSQL. TanStack Query manages workspace data; React Router manages client routes; React Hook Form and Zod manage the identity form. Tailwind is integrated through the Vite plugin; the custom CSS design system supplies the workspace layout.

## Data boundaries

Business is the tenant root. Protected routes resolve the tenant from a persisted session, never from a caller-supplied business ID. Customer, service, staff and appointment operations are tenant-scoped. Composite foreign keys prevent appointments from referencing another business's customer, staff or service.

Public routes return only business, service and staff display data. Public reservation responses contain reservation references and times, not customer identifiers or personal details. Existing customers are matched by tenant and normalized email without publicly returning their records.

## Booking consistency

Creation runs in a transaction, locking the staff row before checking service assignments, hours, time off and conflicts. Time-off creation and availability updates use the same staff lock. A PostgreSQL GiST exclusion constraint over `[startAt,endAt)` provides a second, independent overlap invariant. Adjacent appointments are permitted; confirmed and completed appointments occupy time. Cancelled and no-show appointments do not.

Booking keys are unique per business. The request hash rejects a reused key with a changed payload. An identical retry returns the existing reservation. Cancellation locks the staff, re-reads current state and adds an audit event only when the state changes.

Appointment updates compare timestamp, status and notes values rather than checking whether a field was supplied. Unchanged retries are no-ops. Actual slot changes or reactivation run availability checks; historical notes/completion do not replay today's working hours. Moves into the past are rejected. Each changed category emits its own audit action, including combined edits. The editor omits unchanged dates, preserving seconds and DST offset on historical visits. Mobile logout remains visible and clears the authenticated client state by returning to a fresh sign-in route after server revocation.

The compiled backend entry is dist-server/index.js. `npm start` uses that exact path, and `npm run verify:start` checks startup plus database health. The release retains Prisma/client 6.19.3 and deliberately migrates only the test runner to Vitest 4.1.11; see SECURITY_NOTES.md for the four remaining dependency alert entries.

UTC timestamps use timestamptz. Luxon converts appointment times into IANA business zones for working-hour checks and display. Appointment duration is snapshotted in its start/end times and price in integer minor currency units.

## Security

Passwords use bcrypt with cost 12. Random session and reset tokens are stored as SHA-256 hashes; raw sessions are HTTP-only, SameSite=Lax cookies and Secure in production. Seven-day session expiry is enforced on the server. Password reset tokens expire after one hour, are consumed transactionally, and revoke all sessions. Mutating requests require an exact allowed Origin; authenticated mutations additionally require the session's CSRF token. Helmet and sensitive-endpoint rate limiting are enabled. Payload size and Zod validation bound API input. Unexpected errors expose no database details or sensitive tokens.

The application has one owner permission level. Public signup creates a separate tenant; no user invitation or role hierarchy is implemented. A signed-in business owner can manage all business resources. The public portfolio demo must contain fictional inputs only.

## Deployment preparation

One Render service can serve the built client and API from a single HTTPS origin. The client uses relative /api, preserving host-only SameSite=Lax cookies and avoiding cross-site CORS. server/config.ts validates exact origins, production TLS URL requirements, dynamic PORT, HOST and explicitly bounded proxy trust. Render uses one proxy hop; direct development trusts none. The managed database is independent Neon PostgreSQL with a restricted runtime role and separate direct migration role connection. The migration wrapper consumes DIRECT_DATABASE_URL only for the explicit migration process.

PASSWORD_RESET_MODE defaults to local in development and disabled in production. Public demo forgot/reset handlers return 503 before creating reset tokens or contacting email services. Local recovery is forbidden in production. SMTP requires explicit mode and operator configuration; none has been activated.

The explicit seed creates each synthetic tenant in a transaction. Repeating a known demo seed preserves data. Matching an unrelated slug or account is rejected, preventing a public demo login from being injected into an existing business. Seed and migration are never startup actions. No public deployment is claimed until real browser/cloud verification.

## Operational limits

Workspace data is fetched as a whole: introduce pagination/range queries before large-volume use. In-memory rate limiting is suitable for a single process; use a shared store for multiple replicas. Password reset delivery requires a real SMTP provider in production. Booking times are manually selected and validated when submitted; an available-slot picker is a future UX improvement. Currency formatting currently assumes two decimal minor units; use supported two-decimal currencies. Ambiguous autumn DST times resolve to Luxon's chosen offset; an offset choice UI would improve scheduling in that rare interval. Deleting records referenced by appointment history is refused to retain history.
