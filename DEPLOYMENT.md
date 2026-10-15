# Deployment

No production infrastructure has been created or deployed.

The local portfolio release passes its automated checks and compiled startup smoke test. Four high npm audit entries remain; review SECURITY_NOTES.md before enabling a public service or SMTP. Local verification is not approval to deploy.

## Required environment

- Node.js 22.12+.
- PostgreSQL with permission to enable `btree_gist` during migrations.
- HTTPS reverse proxy forwarding to the Node process on 127.0.0.1:3001.
- Same-origin frontend/API; set APP_ORIGIN to the exact HTTPS URL without a trailing slash.
- DATABASE_URL from the target database, NODE_ENV=production, SMTP_URL, MAIL_FROM, PORT.

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

Production startup refuses missing HTTPS APP_ORIGIN, DATABASE_URL, SMTP_URL or MAIL_FROM. SMTP placeholders in documentation are not credentials and must not be used as proof of delivery. Configure real SMTP only with authorization. Do not disable cookie Secure or CSRF checks to test a hosted environment. Retain a separate migration role, use a restricted runtime role and re-run the hosted flow checklist. Nodemailer major-version remediation/delivery verification and the Prisma/deepmerge tooling alert review are required decisions before public hosting.

No Git remote was created. No secrets, database files or outbox messages belong in source archives. Public demo credentials must never be used for an installation containing real customer data.
