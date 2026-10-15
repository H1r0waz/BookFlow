# BookFlow portfolio release report

Date: October 15, 2026. Status: **Public portfolio demo ready; operational production readiness is not claimed.**

**Dependency remediation deployed (same date):** commit 31fe3663c91a486d82ffa57f8e019c5c11ae7f45, deploy dep-db8ign59fdbs73ee1ojg, is live. Full and production npm audits report 0 vulnerabilities; Render's clean install log also reports zero. Nodemailer 10.1.1 and scoped deepmerge-ts 8.0.2 retain Prisma/client 6.19.3. All 49 local automated tests passed before deployment; 36 public API checks and 8 browser smoke checks passed afterward. No real SMTP was activated. Older release results below are retained as history.

## Corrected

1. npm start now executes the generated dist-server/index.js artifact.
2. Historical appointment editing compares actual timestamps. Notes and completion can be saved without rescheduling; actual moves into the past are rejected. The editor omits unchanged times and rejects nonexistent DST input.
3. Audit events classify actual time, status and notes changes independently. Unchanged retries create no events. Cancellation remains idempotent even when clients include an unchanged date/notes.
4. Mobile navigation keeps logout visible. Logout revokes the session, clears client data and reloads the sign-in route.

## Verification results

| Check | Result |
| --- | --- |
| PostgreSQL API | 17 tests passed |
| Scheduling/timezone/DST | 8 tests passed |
| React Testing Library | 3 tests passed |
| Playwright Chromium | 5 journeys passed |
| Deployment configuration | 10 tests passed |
| Safe demo seeding | 2 tests passed |
| Dependency security/compatibility | 4 tests passed |
| Total automated tests | 49 passed; 0 failed |
| TypeScript / ESLint | Passed |
| Vite frontend / TypeScript backend builds | Passed |
| npm start / compiled backend health | Passed locally |
| Prisma client generation | 6.19.3, passed |
| Prisma validate | Passed |
| Prisma migrate status | Both migrations applied; up to date |
| npm ls --depth=0 | No missing or extraneous packages |
| Screenshots | Six synthetic-demo captures generated and reviewed |

Initial verification exposed a Windows Prisma DLL lock from the running development process; stopping the owned API process and regenerating resolved it. A new mobile test exposed stale UI after server logout; the final implementation reloads sign-in and the regression passes. These initial failures are not counted as successful checks.

## Dependency/security outcome

Prisma/client 6.19.0 → 6.19.3; Vitest 3.2.7 → 4.1.11 after reviewing compatibility. No destructive major application upgrade or force-fix. npm audit full and omit=dev: **4 high, 0 critical, 0 moderate, 0 low**. Remaining entries: Nodemailer, deepmerge-ts, @prisma/config and Prisma. Three entries share the deepmerge root cause. Detailed ranges, exposure and deferred migration decisions are documented in SECURITY_NOTES.md. No claim of zero vulnerabilities or a completed automatic Codex Security scan is made.

## Data and Git

Willow Studio contains 6 synthetic customers, 3 staff, 4 services and 57 appointments. Fixture emails/phone numbers are synthetic and verified before capturing. A residual isolated browser-test tenant from an earlier run is not exposed in the portfolio screenshots; it also contains synthetic data.

Local Git repository on main; no remote configured. Public demo/test passwords are fixtures, not secrets. Environment files, local PostgreSQL data/outbox, logs, builds, node_modules and test artifacts are ignored. Staged source is checked against secret patterns and the actual ignored local database password before the final commit. The final local commit includes this report; obtain its exact ID and clean-tree state with `git log -1 --oneline` and `git status --porcelain`.

## Limitations / deployment

Public Render/Neon deployment, Secure cookies, TLS/proxy and hosted PostgreSQL were verified on October 15, 2026. Real SMTP remains disabled; backup/restore and actual email delivery remain unverified. Hosting uses a restricted DML role, separate from the local development superuser. RLS/granular business-user roles, pagination, distributed rate limiting, currency conversion/history and DST offset selection remain out of scope. Audit records classify actions but do not store before/after snapshots.

The release is appropriate for a public personal portfolio demonstration and source review, with the operational limitations documented in PUBLIC_DEPLOYMENT_REPORT.md.

## Deployment preparation follow-up

The user authorized a private GitHub remote, Render Free and Neon Free. They are now provisioned. PORT/HOST, exact production HTTPS origin, explicit single-proxy trust, disabled recovery and separate migration credentials are configured. The transactional seed created two synthetic businesses and preserved both on repeat. Local production-mode smoke and separate real HTTPS/API/browser checks passed. See DEPLOYMENT_AUDIT.md and PUBLIC_DEPLOYMENT_REPORT.md for provider limits, billing observations, actual URL and deployed application commit.

## Public deployment verification — October 15, 2026

Live demo: https://bookflow-demo-c0g0.onrender.com. Application artifact: 30062ca32e497737f8da683d42fa9897a8629eee. Private GitHub repository; Render Free + Neon Free. Both database migrations, explicit fictional two-tenant seed and non-destructive seed retry passed. Separate restricted runtime role cannot create schema objects or modify migration history. Healthcheck queries the real database. Real HTTPS cookie/Origin/CSRF/logout checks passed, plus 36 HTTP/API checks and 17 native browser checks. The local suite was rerun: 40 Vitest + 5 Chromium tests, lint, typecheck, frontend/backend builds, compiled startup and production-mode smoke passed. npm audit remains 4 high, 0 critical/moderate/low; it exits 1 and is not reported as a clean audit. No paid resources, card, custom domain or SMTP were added.

See PUBLIC_DEPLOYMENT_REPORT.md for precise scope, free-tier limits and remaining operational limitations. This release is a public portfolio demo, not verified operational production readiness.
