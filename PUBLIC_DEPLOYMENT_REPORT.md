# BOOKFLOW PUBLIC DEPLOYMENT REPORT

Verified: October 15, 2026 (America/Buenos_Aires).

## URLs

- Frontend: https://bookflow-demo-c0g0.onrender.com
- Backend/API: https://bookflow-demo-c0g0.onrender.com/api
- Healthcheck: https://bookflow-demo-c0g0.onrender.com/api/health — HTTP 200, status ok, real PostgreSQL query.
- Public booking: https://bookflow-demo-c0g0.onrender.com/book/willow-studio

## Hosting

- Frontend/backend: one Render Free Node service, bookflow-demo, Virginia. Express serves the compiled React SPA and API on one HTTPS origin.
- Database: dedicated Neon Free project bookflow-demo, AWS Virginia, PostgreSQL 18.
- Workspace: Bruno's workspace. Render Hobby billing showed no card, $0 accrued/projected charges; Neon Free showed $0/month. No upgrades, paid resources, domains, card or SMTP were added.
- Dynamic PORT, HOST=0.0.0.0, NODE_ENV=production, exact APP_ORIGIN, TRUST_PROXY_HOPS=1, PASSWORD_RESET_MODE=disabled. Healthcheck /api/health. Auto-deploy and previews disabled.

## Git

- Repository: https://github.com/H1r0waz/BookFlow — private.
- Deployed application commit: 30062ca32e497737f8da683d42fa9897a8629eee.
- Verified live deploy: dep-db8h3pmjh76s739hued0; service srv-db8h3mrrjlhs7385csv0.
- Release documentation is committed afterward on main; runtime application files are unchanged. GitHub noreply email preserves account email privacy.
- Secrets/runtime data are ignored. Repository safety check passed for 55 tracked files before final documentation; an additional cloud-credential scan checked 71 historical blobs and found no actual cloud URLs/passwords. Final Git status and remote alignment are verified after the documentation commit.

## Public functionality verified

36 API checks passed: database health, registration, session persistence, invalid-password rejection, second-tenant login/logout, customer/service/staff creation and editing, availability/service assignment, tenant reads/writes/bookings, concurrent conflict prevention, idempotent retry/payload mismatch, notes audit classification, rescheduling, cancellation idempotency, public data privacy/booking/retry/owner visibility, disabled recovery/reset, direct SPA refresh, logout session revocation and security headers/checks.

17 native browser checks passed: login, dashboard, weekly/daily/monthly calendars, customer/service/team views, availability editor, appointment create/edit/cancel, mobile navigation without horizontal overflow at 390×844, mobile logout, logged-out refresh persistence, public booking page and a confirmed public reservation on mobile. Public registration was verified through HTTP, not counted as a browser-form check. The explicitly identified test records were cleaned up afterward.

## Tests

| Verification | Passed | Failed |
| --- | ---: | ---: |
| PostgreSQL API (Vitest/Supertest) | 17 | 0 |
| Scheduling/timezone/DST | 8 | 0 |
| React UI | 3 | 0 |
| Deployment configuration | 10 | 0 |
| Safe demo seed | 2 | 0 |
| Playwright Chromium journeys | 5 | 0 |
| Total local automated tests | 45 | 0 |
| Public HTTP/API checks (separate) | 36 | 0 |
| Native browser checks (separate) | 17 | 0 |

Lint, typecheck, frontend/backend builds, compiled npm start, production-mode local smoke, Prisma validate and remote migrate status passed. The 36/17 public checks are not added to the automated suite count. No line-coverage percentage or load benchmark is claimed.

## Security

- HTTPS: actual Render URL and real API/browser requests verified.
- Cookies: HttpOnly, Secure, SameSite=Lax, Path=/; session persistence and server-side revocation verified.
- CORS/Origin: same origin, no wildcard CORS; foreign-origin write rejected with 403.
- CSRF: authenticated mutations without the session CSRF token rejected with 403.
- Rate limiting: authentication 30 requests/15 minutes and public endpoints 90/minute; draft rate-limit headers observed publicly. Per-process, not distributed; no saturation/load test was performed on the public service.
- Tenant isolation: isolated demo businesses plus a temporary verification business; foreign reads/mutations/bookings blocked. Database constraints and transactional locks retained.
- Passwords: bcrypt; opaque session tokens hashed at rest. No real SMTP or local-outbox mode in production.
- npm audit final: **4 high, 0 critical, 0 moderate, 0 low**; exit code 1. Nodemailer and propagated deepmerge-ts → @prisma/config → prisma alerts remain. Public email/recovery handlers are disabled before token creation or mail use. Prisma tooling does not receive public merge input. No destructive major upgrades/force fixes were applied. See SECURITY_NOTES.md; this is not vulnerability-free software.

## Database

Two migrations applied: 202610140001_initial and 202610140002_booking_constraints. Prisma migrate status: up to date; Prisma validate passed. btree_gist, exclusion constraints, indexes and composite tenant foreign keys retained. No db push.

Explicit transactional seed created Willow Studio and Harbor Studio; a second run preserved both. Fictional data only. Demo credentials: demo@bookflow.example and harbor@bookflow.example, password BookFlowDemo!2026. Never use these fixtures with real customer data.

Runtime uses a separate DML role with pooled hostname and connection_limit=3. Verified NOSUPERUSER/NOCREATEDB/NOCREATEROLE, no schema CREATE and no migration-table modification. Future application table/sequence default privileges are configured. Migration-owner credentials are not supplied to Render. Local migration IPv6 failed; process-local IPv4 routing with required TLS succeeded, without modifying global DNS/hosts or application transport.

## Limitations

- SMTP/password recovery disabled publicly (503); actual email delivery not verified.
- Four high dependency alerts remain documented.
- Render Free: idle spin-down after 15 minutes, cold starts, shared 750 instance-hours/month and workspace bandwidth/build quotas, ephemeral disk, no paid scaling/SLA or interactive shell. Suspension is possible when free allowances are exhausted. At verification, the workspace UI showed 5 GB bandwidth and 500 pipeline minutes/month; quotas are provider-controlled and may change.
- Neon Free: console displayed 100 compute hours and up to 1 GB/project; this new project's API reported a 512 MiB branch logical-size cap. Keep below that stricter cap. Compute can suspend; there is no paid availability guarantee.
- Shared demo owner credentials allow visitors to modify fictional records. Registration is open and rate-limited; this is not suitable for private customer data.
- No production monitoring/on-call, backup restore drill, disaster recovery exercise, distributed rate limiting, multi-replica concurrency or load benchmark is claimed.
- Workspace fetching is unpaginated, audit events lack before/after snapshots, currency changes do not convert history, repeated DST wall times use Luxon's chosen offset and public booking takes manually selected times rather than listing free slots.

## Final status

**Demo pública lista para portafolio.** Operational production readiness is not claimed. Public statements can describe a personal full-stack booking demo with the verified flows and exact test/check counts above, hosted on free tiers with documented limitations.

## Summary for ChatGPT

Public URL: https://bookflow-demo-c0g0.onrender.com. Personal demonstration project, not client work. Stack: React/Vite/TypeScript + Express/Prisma/PostgreSQL. Hosting: Render Free + Neon Free; private GitHub repository. Verified booking/edit/cancel, public booking, tenant isolation, concurrency/idempotency, HTTPS/cookies/Origin/CSRF and mobile logout. 45 local automated tests passed, plus 36 public API checks and 17 native browser checks; lint/typecheck/build/Prisma checks passed. SMTP/recovery disabled, 4 high audit alerts documented, free-tier cold starts/quotas and operational limits remain. Deployed application commit: 30062ca32e497737f8da683d42fa9897a8629eee.
