# Security and dependency review

Reviewed October 15, 2026. This is a portfolio demonstration, not a security certification.

## Dependency remediation

The previous four high npm audit entries came from two roots: Nodemailer 7.0.13 and deepmerge-ts 7.1.5, propagated through @prisma/config and prisma. The updated local graph resolves both roots to patched releases; no advisory was suppressed or excluded from audit.

- Nodemailer 7.0.13 → **10.1.1**, pinned. This is a deliberate reviewed migration, not npm audit fix --force. BookFlow uses only createTransport(SMTP_URL).sendMail({from,to,subject,text}). Node 24.14.1 and the documented Node 22.12+ minimum satisfy Nodemailer 10's Node 20+ requirement. No caller uses the renamed NoAuth error, fetched content, OAuth, attachments, custom plugins or proxy APIs. Nodemailer 10 includes declarations, so obsolete @types/nodemailer 7 was removed. A loopback SMTP test checks the actual URL-based transport, recovery-shaped message and EHLO command injection.
- Prisma and @prisma/client stay **6.19.3**. A narrowly scoped npm override replaces only @prisma/config@6.19.3's deepmerge-ts with **8.0.2**. Prisma imports the named deepmerge as c12's configuration merger. v8 changes Map merging, custom metadata types and deepmergeInto mutations; this repository uses none of these features. Tests resolve the dependency from the actual Prisma consumer, exercise recursive/shared graphs and prototype isolation, and load explicit Prisma configuration. Revisit the override when upgrading Prisma; never replace the safe entrypoint with deepmergeFastUnsafe.
- Earlier work updated Prisma 6.19.0 → 6.19.3 and Vitest 3.2.7 → 4.1.11. This patch introduces no application framework or Prisma major migration.

Primary references: [Nodemailer changelog](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md), [deepmerge-ts v8 changes/security fix](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), [recursive-graph advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [Nodemailer parser advisory](https://github.com/advisories/GHSA-v53p-9fqp-m79j).

## Audit and deployment boundary

The updated local dependency graph reports **0 vulnerabilities**. Full and omit=dev audits must both pass before release. This means no known matching npm advisories at verification time; it is not a security certification.

The user authorized deployment of 31fe3663c91a486d82ffa57f8e019c5c11ae7f45. Render deploy dep-db8ign59fdbs73ee1ojg is live and its clean installation log confirms 0 vulnerabilities. The corrected public artifact passed 36 API checks and 8 native browser smoke checks (login/dashboard/calendar/customers, direct authenticated route refresh, mobile navigation/logout and public booking). Real SMTP remains disabled, with no external provider activated. PUBLIC_DEPLOYMENT_REPORT.md records the current artifact and distinguishes initial broader browser coverage from this release smoke.

## Regression verification

tests/dependency-security.test.ts adds four checks: recursive/shared graphs without stack exhaustion, prototype isolation for parsed keys, actual Prisma config loading through the override, and legitimate loopback SMTP delivery plus attempted EHLO command injection. They complement existing recovery/session, configuration, timezone/DST, tenancy, concurrency, public booking and mobile logout tests. TESTING.md records exact counts.

## Application controls

Opaque hashed sessions; bcrypt cost 12; HttpOnly/SameSite cookies, Secure in production; exact Origin and session CSRF checks; Zod/input limits; tenant-scoped queries; composite tenant foreign keys; PostgreSQL exclusion constraint; staff-row locks; scoped idempotency; single-use expiring reset tokens with session revocation. These controls are unchanged.

PASSWORD_RESET_MODE=disabled rejects production forgot/reset before tokens, outbox writes or mail. Local outbox is forbidden in production. SMTP needs explicit configuration and authorization. Loopback tests do not prove real provider delivery, SMTP authentication or provider TLS configuration.

## Secrets, data and remaining limits

.env, .env.* except the example, .local, node_modules, logs, databases, private keys, builds and test output are ignored. Only fictional fixtures and public demo passwords belong in source; cloud credentials are not committed.

Hosted runtime uses a separate restricted DML role without schema CREATE or migration-history modification. RLS is absent; isolation relies on application scoping and database relationships. Rate limiting is process-local; public customer identity is not email-verified. Shared demo credentials allow edits to fictional records. Free quotas/cold starts, restore drills, monitoring and multi-replica behavior remain operational limits unrelated to the corrected advisories.
