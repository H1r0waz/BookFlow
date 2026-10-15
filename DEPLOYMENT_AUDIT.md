# Public deployment audit and decision

Reviewed October 15, 2026. **No cloud resource or Git remote created. No public URL exists yet.** The previous locally verified release is bd51376; the working tree now contains reviewed deployment preparation.

## Recommendation

One Render Free Node web service serves Express and the Vite build, with a separate Neon Free PostgreSQL project. One HTTPS origin preserves the existing host-only HTTP-only/Secure/SameSite=Lax cookie, same-origin fetch credentials and exact Origin/session-CSRF validation. PostgreSQL/Prisma and the compiled npm start entry stay unchanged. No custom domain, paid plan, SMTP service, background worker or Redis is required.

| Alternative | Assessment |
| --- | --- |
| Vercel frontend + Render backend + managed PostgreSQL | Three providers and cross-site session/cookie complexity; no gain for this small demo. |
| Render frontend/backend + Render PostgreSQL | Simple, but Free PostgreSQL expires after 30 days; unsuitable for a persistent portfolio link. |
| Vercel + Neon | Technically possible, but serverless runtime adaptation and Vercel Hobby's personal/non-commercial usage restriction need review for this freelance portfolio goal. |
| Render frontend/backend + Neon Free | Recommended: two providers, normal long-running Express process, shared frontend/API origin and portable PostgreSQL. |

## Current provider limits / cost safeguards

Verified from official public documentation, not account eligibility:

- Render Free: 750 instance-hours/workspace/month shared with other free web services; idle spin-down after 15 minutes, approximately one-minute restart, ephemeral filesystem, no scaling or interactive shell. Managed TLS is supported. Bandwidth/build allowances are shared. Exceeding allowances can bill if the workspace has a payment method; otherwise services/builds can be suspended. This must be checked before provisioning. External database traffic can also trigger suspension under service-initiated traffic policies. No uptime promise.
- Neon Free: $0, no credit card, 100 CU-hours/month/project, 1 GB/project at review time. Quotas and account policy must be confirmed in the actual account. Compute can scale to zero; first queries may incur cold-start latency. It is not a paid production SLA.
- Do not enter a card, activate overages, upgrade a plan or add paid integrations. If $0 cannot be guaranteed by the account's controls, stop and obtain explicit authorization instead of creating resources.

Sources: https://render.com/docs/free, https://render.com/docs/blueprint-spec, https://neon.com/pricing, https://vercel.com/docs/plans/hobby.

## Concrete resources pending authorization

1. Private GitHub repository, proposed name BookFlow, populated only with reviewed source/docs/assets.
2. One Neon Free project dedicated to BookFlow demo data. A migration role plus restricted runtime role; use nearby regions if available on Free.
3. One Render Free service, proposed name bookflow-demo, using render.yaml. Public frontend/API share the assigned onrender.com origin; /api/health is the healthcheck. Name/URL availability is unknown.

## Required environment / inputs

- GitHub account and explicit approval to create/push the private remote. No repository is made public.
- Render account/workspace access and confirmation of Free/overage/payment settings. Creating accounts, granting Git integration and accepting provider terms may require the user's own action.
- Neon account access or a securely configured connection. Never paste passwords/tokens into chat or commit them.
- Assigned Render HTTPS origin sets APP_ORIGIN. DATABASE_URL is the Neon TLS runtime connection. Runtime does not receive the migration role's secret. DIRECT_DATABASE_URL is used only for explicit migrations/seed when necessary.
- NODE_ENV=production, HOST=0.0.0.0, PASSWORD_RESET_MODE=disabled; PORT comes from Render. TRUST_PROXY_HOPS=1 assumes exactly the Render edge proxy; verify headers publicly.

## Prepared and verified locally

Dynamic host/port and origin validation; explicit single-proxy trust; production without SMTP; disabled public reset endpoints; built SPA route fallback; production cookie flags and Origin/CSRF rejection; transactional seed for two isolated fictional businesses, non-destructive retry and collision rejection; explicit migration role URL wrapper. Existing migrations/constraints are retained; no db push.

The frontend calls relative /api on the same public origin: this is the API-base equivalent for the chosen architecture and has no localhost dependency in production. No wildcard CORS or cross-site cookies are enabled. A split-domain deployment is intentionally unsupported by this configuration.

## Security decision

npm audit remains 4 high / 0 critical / 0 moderate: Nodemailer plus the propagated Prisma/deepmerge tooling chain. No force fix or destructive major upgrade. PASSWORD_RESET_MODE=disabled prevents both password reset handlers before token creation/SMTP in the public demo. SECURITY_NOTES.md retains details. This reduces public exposure; it is not proof that the dependency tree is vulnerability-free.

## Approval boundary and future verification

No cloud database migration, seed or deployment has run. Native public-browser tests must follow the actual deployment, including two distinct tenants, full CRUD/booking/calendar/mobile paths, concurrency, idempotency, TLS, cookie persistence and direct route refresh. Local simulated-proxy checks do not count as public HTTPS verification.

A final PUBLIC_DEPLOYMENT_REPORT.md must contain actual URLs and a deployed commit only after successful provider and browser verification; placeholders must never be presented as live URLs.
