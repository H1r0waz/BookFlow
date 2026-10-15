# Deployment

No production infrastructure has been created or deployed. **Recommended pending approval:** one Render Free service serving React/Express on the same HTTPS origin and a dedicated Neon Free PostgreSQL project. See DEPLOYMENT_AUDIT.md for alternatives, current free limits, potential overage risks and the authorization boundary. render.yaml is validated against Render's official JSON schema; it has not been applied to an account.

The local portfolio release passes its automated checks and compiled startup smoke test. Four high npm audit entries remain; review SECURITY_NOTES.md before enabling a public service or SMTP. Local verification is not approval to deploy.

## Required environment

- Node.js 22.12+.
- PostgreSQL with permission to enable `btree_gist` during migrations.
- HTTPS reverse proxy forwarding to the Node process on 127.0.0.1:3001.
- Same-origin frontend/API; set APP_ORIGIN to the exact HTTPS URL without a trailing slash.
- TLS DATABASE_URL from the target database, NODE_ENV=production, HOST=0.0.0.0, PASSWORD_RESET_MODE=disabled. PORT is supplied by Render; APP_ORIGIN is the exact assigned HTTPS origin. TRUST_PROXY_HOPS=1 is specific to the single Render edge proxy; retain 0 for direct local traffic.

Use a migration role with DDL permissions and a restricted runtime database role. Never upload `.env`, `.local`, seed demo data or development reset outbox to production. Configure environment variables through your host's secret store.

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm run verify:start
npm start
```

Do not run `db:start` on a production host: that script is specifically for local development.

## Release checklist

Back up the database before migrations. Test restore procedures. Use a staging database first. Run integration and browser tests on staging with fixture-only data. Confirm `/api/health`, registration, login, CSRF rejection, cross-tenant access rejection, real public booking, concurrency conflict, SMTP reset and logout. Verify HTTPS cookie flags and timezone behavior with the intended business zone. Configure monitoring and log redaction, session/token cleanup, database backup retention and abuse controls.

Multi-replica deployments require shared rate-limit storage and a correct, narrowly scoped Express proxy trust configuration. This repository defaults to no trusted proxy and a local listener; configure host networking and proxy IP ranges deliberately for your selected platform.

## Screenshots

`npm run test:e2e` produces `test-results/dashboard.png`, `mobile.png` and `public-booking.png`. These contain fictional seeded data only. Re-run after visual changes.

For all six portfolio views, run `npm run screenshots`. Reviewed captures are kept under docs/screenshots; regenerate them only using the synthetic local demo.

## Verified artifact and pending hosted checks

The backend is emitted at dist-server/index.js and `npm start` invokes it. With NODE_ENV=development, startup serves the API and Vite serves the client separately. The development origin must remain http://127.0.0.1:5173; using localhost instead is a different origin and mutations will be rejected.

Production startup refuses missing/invalid HTTPS APP_ORIGIN, missing DATABASE_URL, invalid PORT/proxy settings or local-outbox recovery. SMTP is not required when PASSWORD_RESET_MODE=disabled. It is required only when smtp mode is explicitly enabled. Never enable real SMTP without authorization. Do not disable Secure cookies or CSRF checks to accommodate a host. Retain a separate migration role, use a restricted runtime role and re-run the hosted flow checklist. The Nodemailer/deepmerge alerts remain documented; the public demo disables email recovery.

## Explicit free-tier deployment sequence

1. Obtain approval for a private Git remote and confirm Render/Neon access and $0 controls. Do not apply the Blueprint if payment/overage settings allow charges.
2. Create the dedicated Neon Free project only after account eligibility is confirmed. Use TLS connections, prefer a pooled runtime endpoint with a small connection_limit (for example 3), and a direct endpoint for migration operations. Verify btree_gist is available and use a separately restricted runtime role with schema/table/sequence DML privileges, not DDL. Default privileges must cover future migration-created tables. Do not use the local superuser or local data directory.
3. Supply DIRECT_DATABASE_URL for the migration/seed role through the local process environment, never shell arguments or Git. `npm run db:migrate` uses it when set; otherwise it uses DATABASE_URL. Existing migration SQL, exclusion constraints and indexes are retained. Never substitute prisma db push.
4. Run `npm run db:seed` explicitly against the dedicated demo database. It creates Willow Studio and Harbor Studio once; repeat runs preserve existing records, passwords and edits. An unrelated existing slug/account is rejected. No seed is in build/start commands.
5. Apply render.yaml with the private repository and no paid resources. Build: npm ci --include=dev, generate Prisma client, build. Start: npm start. Set APP_ORIGIN to the actual assigned Render URL and DATABASE_URL to the runtime role connection. No secrets are embedded in the Blueprint. Do not provide DIRECT_DATABASE_URL to the runtime service. Auto-deploy is off.
6. Verify the real public origin in a browser: login/register/logout, dashboard, customers/services/team/availability, all calendar views, booking/edit/cancel, two-tenant isolation, overlaps, mobile, direct SPA refresh, TLS and cookie flags. Check rate limiting with actual proxy IP headers. Only then update public URL/commit claims.

The frontend's relative `/api` base is the environment-independent equivalent of VITE_API_URL for this single-origin architecture. No production request targets localhost, no cross-site cookies are needed, and no wildcard CORS is enabled. This configuration does not silently support splitting frontend/backend across unrelated domains.

`npm run verify:production` checks the built SPA and production-mode cookie/session/Origin/CSRF/recovery behavior locally with a simulated HTTPS proxy header. It does not prove real TLS, cloud connectivity or provider billing eligibility.

Current progress (2026-10-15): private GitHub origin configured at https://github.com/H1r0waz/BookFlow; push awaits GitHub device verification. Dedicated Neon Free database in Virginia has both migrations applied and two fictional businesses seeded. Prisma validate and migrate status passed against that database. Runtime role is restricted to application DML and cannot alter schema or migration history. Render Hobby billing has no card and shows $0; no Render application service has been created yet. Public verification remains pending.

On this local network, IPv6 PostgreSQL connections failed while IPv4 succeeded. Explicit migration/seed processes used a resolved IPv4 address with Neon's endpoint routing option and required TLS; this did not change global DNS or application code. Hosted runtime must retain the pooled provider hostname.

No secrets, database files or outbox messages belong in source archives. Public demo credentials must never be used for an installation containing real customer data.
