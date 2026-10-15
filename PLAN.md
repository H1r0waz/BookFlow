# BookFlow implementation plan

All product copy and project documentation use English. Human collaboration uses Spanish.

1. Foundation: Vite/React/TypeScript client, Express/TypeScript API, Prisma/PostgreSQL schema, isolated local database, repeatable commands.
2. Identity: registration, password hashing, opaque sessions, CSRF protection, password reset, tenant authorization.
3. Operations: customers, services, staff, assignments, working hours, time off, settings.
4. Scheduling: transactional booking, database exclusion constraint, UTC storage, business timezone validation, audit events and idempotency.
5. Experience: responsive dashboard, calendar views, CRUD forms, public booking.
6. Verification: type checks, lint, unit/integration/concurrency tests, browser journeys, build and documentation.

## Architecture decisions

- One repository and package manifest; separate client and server folders.
- PostgreSQL is authoritative. Never silently replace it with in-memory production data.
- An isolated project-local PostgreSQL cluster avoids altering existing databases.
- Opaque session cookies with server-side persistence; mutations require same-origin requests and CSRF tokens.
- Appointment exclusion constraint prevents concurrent overlapping reservations, including requests handled by different server processes.
- Local password-reset mail is written to an ignored development outbox. Production requires a configured email transport.

## Progress

- Workspace inspected: empty workspace, Node 24 and PostgreSQL 18 available.
- Phases 1–6 implemented locally: database, identity, operations, scheduling, responsive interface and verification.
- PostgreSQL migrations and fictional seed applied successfully.
- TypeScript, lint, unit/API/UI tests and production build verified. Browser journeys verified separately; see TESTING.md.
- External SMTP delivery and live production deployment require environment-specific verification.

## Portfolio stabilization — October 15, 2026

- Corrected compiled start path, historical appointment editing, actual-change audit classification, mobile logout visibility and client reset.
- Added targeted API, timezone/DST, React recovery and Chromium regressions: 33 automated tests total.
- Updated Prisma/client to 6.19.3 and reviewed Vitest 4.1.11; retained/documented four high dependency alerts without forced upgrades.
- Verified lint, TypeScript, both builds, compiled startup, Prisma generation/schema/migration status and fictional fixture provenance.
- Prepared six portfolio screenshots, bilingual description, case study, security notes and release report.
- Initialized local Git, excluded private/runtime artifacts and prepared a final local release commit. No remote or deployment authorized.
