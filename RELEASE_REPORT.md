# BookFlow portfolio release report

Date: October 15, 2026. Status: **Portfolio ready for local presentation; not a deployed public demo.**

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
| Total automated tests | 45 passed; 0 failed |
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

No deployment performed and no real SMTP configured. Production Secure cookies, TLS/reverse proxy, hosted PostgreSQL, backup/restore and real email delivery remain unverified. The development database role is a local superuser and must not be used as a hosted runtime role. RLS/granular roles, pagination, distributed rate limiting, currency conversion/history and DST offset selection remain out of scope. Audit records classify actions but do not store before/after snapshots.

The release is appropriate for a truthful local portfolio walkthrough and source review. Hosting requires a separate authorized release step and the DEPLOYMENT.md checklist.

## Deployment preparation follow-up

No cloud resource or remote has been created. The new local configuration targets Render Free (one frontend/API origin) and Neon Free. PORT/HOST, exact production HTTPS origin, explicit single-proxy trust, production-mode disabled recovery and separate migration URL handling are prepared. The transactional seed creates two synthetic businesses explicitly and preserves existing data. Production-mode loopback smoke passes, including cookie flags and Origin/CSRF; this is not verification of actual HTTPS. See DEPLOYMENT_AUDIT.md for provider limits, account/payment checks and required authorization. No public URL or deployed commit is claimed.
