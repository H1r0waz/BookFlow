# Security and dependency review

Reviewed locally on October 15, 2026. This is a portfolio demonstration, not a security certification.

## Dependency changes

- Prisma and @prisma/client: 6.19.0 → 6.19.3, kept in sync. The patch updates Effect to 3.21.0, removing its reported context-contamination advisory.
- Vitest: 3.2.7 → 4.1.11. This was a deliberate test-tool migration after checking Node 24/Vite 7 prerequisites and the official v4 migration guide: https://v4.vitest.dev/guide/migration.html. The existing configuration does not use the removed APIs. All backend, logic and React tests pass. This removes the vulnerable tinypool dependency and fixes the mocker advisory.
- Removed the three extraneous packages as part of dependency reconciliation. No forced audit fix, application-framework major upgrade, Prisma downgrade or speculative transitive override was applied.

## Final npm audit

`npm audit --json` and `npm audit --omit=dev --json` both report **4 high, 0 critical, 0 moderate, 0 low** affected package entries. Exit code 1 is expected while these alerts remain. They are not four independent exploitable application findings.

| Entry | Root cause / application exposure | Decision |
| --- | --- | --- |
| deepmerge-ts 7.1.5 | Recursive object graph stack exhaustion, GHSA-ggr8-5vv4-36mx. Brought in by Prisma configuration tooling. BookFlow does not pass request payloads into that tool or expose a configuration endpoint. | Retain Prisma 6.19.3; upstream pins deepmerge-ts 7.1.5. Do not force an unverified major override or downgrade Prisma to the registry's proposed 6.12.0. Reassess before public hosting. |
| @prisma/config 6.19.3 | Propagated alert from deepmerge-ts, not a separate BookFlow endpoint. | Same decision. |
| prisma 6.19.3 | Propagated alert from @prisma/config. npm's omit=dev graph still includes this peer/tooling chain; do not describe it as absent merely because prisma is declared under devDependencies. | Same decision. |
| nodemailer 7.0.13 | SMTP injection, parser complexity, file/URL access bypasses and TLS-related advisories listed by npm audit. BookFlow uses a trusted operator-configured SMTP URL, a fixed subject/text body and one Zod-validated email bounded to 254 characters. It does not accept raw messages, attachments, structured recipient arrays, List-* headers, envelope.size, user-controlled transport names or OAuth2 settings. This reduces exposure to several advisories, but does not prove the dependency safe. | Keep SMTP disabled locally; recovery uses the ignored outbox. npm proposes Nodemailer 10.1.1, a multi-major upgrade. Defer a reviewed SMTP migration and delivery tests until separately authorized. Do not publish the real SMTP path as production-ready. |

Detailed advisories and affected ranges can be regenerated with `npm audit --json`. Relevant root advisories include https://github.com/advisories/GHSA-ggr8-5vv4-36mx and https://github.com/advisories/GHSA-v53p-9fqp-m79j. No exploit against BookFlow was demonstrated, and no claim of zero vulnerabilities is made.

## Application controls verified

Opaque hashed sessions; bcrypt cost 12; HTTP-only/SameSite cookies; exact Origin and session CSRF token checks; server-side Zod validation; tenant-scoped queries; composite tenant foreign keys; PostgreSQL exclusion constraint; staff-row transaction locks; scoped idempotency keys; single-use expiring password reset tokens with session revocation.

The mobile logout revokes the server session and returns to sign-in. Historical edits do not bypass checks when a slot actually moves or is reactivated. Cancellation and unchanged retries add no duplicate audit actions.

## Secrets and data

`.env`, `.env.*` except the example, `.local`, node_modules, logs, database files, certificates/private keys, builds and test outputs are ignored. Only synthetic fixture accounts and public demo passwords belong in source. The real local database password must never be copied into documentation or Git.

The local PostgreSQL role remains an isolated localhost development superuser. Use a separate migration role and a restricted runtime role for hosting. RLS is not implemented; isolation relies on the API and database relationships. Rate limits are process-local. Public customer identity is not email-verified. HTTPS proxy behavior, production Secure cookies and real SMTP delivery remain unverified.
