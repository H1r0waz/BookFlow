# BookFlow case study

## Problem

Small service businesses need one place to manage appointments, customers, services and staff availability. A visually polished calendar alone is insufficient: simultaneous bookings, different business timezones and accidental access across businesses can corrupt or expose business data.

## Solution

An English-language React workspace and a public booking page backed by a real PostgreSQL database. The portfolio demo uses fictional Willow Studio staff and clients. Customers choose a service, a qualified team member and a local time; the server validates availability before committing a reservation.

## Architecture

One repository: Vite serves React in development and proxies the Express API; the compiled Express application can serve the built SPA in production. Prisma handles relational queries. TanStack Query manages client data; Zod validates server boundaries. Existing CSS and Tailwind integration provide responsive styling without a component framework migration.

## Main modules

- Identity: registration, login, opaque sessions, logout and local password recovery.
- Operations: customers/history, service duration/price, staff/service assignments.
- Scheduling: three calendar views, booking, historical corrections, rescheduling, status, cancellation, working hours and time off.
- Business settings: timezone and currency display.
- Audit trail: actor, timestamp, appointment and independently classified actions.

## Business rules and concurrency

Appointments store UTC instants and snapshot their price and elapsed duration. Staff-row locks serialize booking and availability mutations; PostgreSQL GiST exclusion rejects overlapping active intervals even outside the API. Adjacent appointments are allowed. Booking checks service assignment, business-local hours, time off and existing reservations. Cancelled/no-show appointments release their slots.

Per-business request keys and payload hashes make identical reservation retries safe. Cancellation and unchanged edits are idempotent. Audit events are emitted only for actual changes; a combined edit can record rescheduling, status and notes separately. Historical notes/completion do not reserve a new slot or get rejected merely because the original date is past; an actual move into the past is rejected.

## Multi-tenancy

The server derives the business from the session. Protected queries are scoped to that business. Composite appointment foreign keys prevent links to another business's customer, service or staff. Public responses omit customer data. RLS and granular roles are outside this release; owners can manage their business resources.

## Testing and verification

45 automated tests: 17 PostgreSQL API, 8 timezone/scheduling, 3 React UI, 10 deployment configuration, 2 safe seed and 5 Chromium journeys. Tests exercise tenant mutations, overlapping/adjacent bookings, four simultaneous identical requests, idempotency, password reset expiry/single use, historical editing, independent audit actions, public booking persistence and mobile logout. This is scenario coverage, not a measured line-coverage percentage or load benchmark.

TypeScript, ESLint, frontend/backend builds, generated Prisma client, schema validation and applied migration status pass. The corrected npm start path and compiled backend health are verified. Six screenshots demonstrate desktop and mobile states with synthetic data.

## Security

bcrypt passwords, hashed opaque session/reset tokens, HTTP-only cookies, Origin and CSRF checks, input limits, sensitive-route rate limiting, safe errors and tenant boundaries. The release updates Prisma within v6 and migrates the test runner to reviewed Vitest 4.1.11. npm audit decreases from 8 affected entries to 4 high entries, with no remaining critical/moderate entries. SECURITY_NOTES.md explains the remaining Nodemailer and Prisma tooling chain alerts and reachable inputs; absence of a demonstrated exploit is not a clean security bill.

## Limitations and future public demo

No deployment, remote repository, purchased services or real SMTP configuration. Production needs HTTPS verification, restricted database roles, reviewed proxy settings, external email verification and dependency re-evaluation. Workspace fetching is unpaginated; rate limiting is per-process; audit entries have no before/after snapshots; currency changes do not convert historical amounts; repeated DST times use Luxon's chosen offset. The public booking page validates manually selected times rather than listing available slots. These limitations are declared, not presented as completed features.
