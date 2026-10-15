# Testing and verification

Verified on October 15, 2026, Windows, Node.js 24.14.1, PostgreSQL 18.6, Prisma 6.19.3, Vitest 4.1.11 and Playwright Chromium.

## Commands

```powershell
npm run db:start
npm run db:generate
npx prisma validate
npx prisma migrate status
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:start
npm run verify:production
npm run test:e2e
npm audit
npm audit --omit=dev
```

Install Chromium once with `npx playwright install chromium`. API/integration tests use the configured local PostgreSQL database and create isolated synthetic tenants. Cleanup deletes only their fixtures. Never point the suite at real customer data. The historical browser regression temporarily edits one fictional seed visit and restores its notes. Password recovery uses ignored `.local/outbox` and never contacts SMTP with the default environment.

## Exact results

| Suite | Passed | Failed |
| --- | ---: | ---: |
| PostgreSQL API (tests/api.test.ts) | 17 | 0 |
| Scheduling/timezone/DST (tests/scheduling.test.ts) | 8 | 0 |
| React Testing Library (tests/ui.test.ts) | 3 | 0 |
| Deployment configuration (tests/config.test.ts) | 10 | 0 |
| Transactional/idempotent seed (tests/seed.test.ts) | 2 | 0 |
| Chromium e2e (tests/browser/journeys.spec.ts) | 5 | 0 |
| Total | 45 | 0 |

TypeScript, ESLint, Vite frontend build, TypeScript backend build, compiled backend/database health, Prisma generate/validate and both applied migrations pass. `npm start` executes dist-server/index.js. `npm ls --depth=0` reports no missing or extraneous dependencies.

## Regression coverage

- Tenant reads, customer/staff/appointment mutations and cross-business availability requests.
- Conflicting and adjacent reservations; raw database exclusion constraint; restoring a cancelled reservation into an occupied slot.
- Simultaneous competing reservations and four concurrent identical request-key retries; one reservation and one creation audit event for retries.
- Historical completion/notes with unchanged timestamp; moving into the past rejected; no-op edits create no audit events.
- Combined rescheduling/status/notes events and idempotent cancellation with date payloads.
- Public reservation persistence, response privacy, replay and unknown business.
- Password reset expired/unknown tokens, single use, session revocation and generic recovery UI confirmation.
- UTC/business hours, winter/summer offsets, actual spring transition, repeated autumn local times and nonexistent spring wall time detection.
- Mobile navigation/logout returns to sign-in and rejects the old session; historical editor works in a real browser.

## Security checks and limitations

Deployment preparation adds configuration validation, safe demo-seed retry/collision checks, and a compiled production-mode smoke test. The smoke checks shared SPA/API origin, Secure/HttpOnly/SameSite cookies, session/logout, Origin/CSRF rejection and disabled recovery without SMTP. It uses loopback HTTP with simulated proxy metadata: the local smoke itself does not verify cloud HTTPS. Separately, the real Render HTTPS deployment and Neon database were verified on October 15, 2026: 36 API checks and 17 browser checks passed; account billing showed Free/Hobby with no Render card and $0 accrued charges. render.yaml passes validation against the official draft 2020-12 JSON schema; this is not an applied Render Blueprint.

npm audit full and omit=dev return exit code 1: four high entries, zero critical/moderate/low. See SECURITY_NOTES.md for roots, actual inputs, mitigations and deferred major upgrades. Those alerts are not ignored or represented as passing security checks.

No line-coverage percentage, production load benchmark, multi-replica concurrency, external SMTP delivery or hosted backup/restore is claimed. Autumn offset selection remains a documented UX limitation. The suite protects representative paths; it does not prove every possible tenant/input permutation.

## Public deployment verification — October 15, 2026

Origin: https://bookflow-demo-c0g0.onrender.com. Application artifact: 30062ca32e497737f8da683d42fa9897a8629eee.

- 36 HTTP/API checks passed: health with database, registration, two tenant sessions, invalid password, secure cookies, rate-limit headers, unauthenticated access, Origin/CSRF rejection, customer/service/staff creation and editing, availability, tenant read/write/booking isolation, one winner for competing reservations, replay/payload mismatch, notes/audit classification, rescheduling, idempotent cancellation, public profile privacy, public booking/replay/owner visibility, disabled recovery/reset, SPA route refresh and logout revocation.
- 17 native browser checks passed: login, dashboard, day/week/month calendars, customer/service/team views, availability editor, appointment creation/edit/cancel, mobile navigation without horizontal overflow at 390×844, mobile logout, logout persistence after refresh, public booking page and confirmed public reservation on mobile. These are manual browser checks, not additional Playwright test cases.
- Verification used fictional records only. The temporary API tenant and explicitly identified browser records were removed afterward; the two seeded demo businesses remain.
- Rate-limit headers and configured limits were verified; no production traffic/load benchmark or multi-replica limiting is claimed. Public registration was tested through HTTP; its browser form is not an additional claimed browser test.

## Screenshots

`npm run dev`, then `npm run screenshots`, produces six reviewed synthetic-data images under docs/screenshots. E2e failure artifacts remain ignored under test-results. Existing upstream Zod Rollup annotation notices and NO_COLOR/FORCE_COLOR warnings do not fail the build/tests.
