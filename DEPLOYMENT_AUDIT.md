# Public deployment audit and decision

Reviewed October 15, 2026. **Public portfolio demo verified:** https://bookflow-demo-c0g0.onrender.com. Private GitHub repository, Render Free service and separate Neon Free database created with user authorization. Both migrations and explicit fictional demo seed completed; 36 public API checks and 17 native browser checks passed. See PUBLIC_DEPLOYMENT_REPORT.md for the deployed application commit and remaining limitations.

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

## Authorized resources and current progress

1. Private GitHub repository https://github.com/H1r0waz/BookFlow created. Local origin configured and source pushed. Git author/committer emails were changed to the GitHub noreply address after privacy protection rejected the first push; protection stayed enabled.
2. Neon Free project bookflow-demo created in AWS Virginia, separate from local development. Both Prisma migrations and the explicit fictional two-business seed completed. A restricted DML runtime role is separate from the migration owner; it cannot create schema objects or modify migration records.
3. Render workspace Bruno's workspace confirmed by the user. Billing shows Hobby, no card on file and $0 accrued charges. Render Free service bookflow-demo is live at https://bookflow-demo-c0g0.onrender.com, with /api/health configured and auto-deploy off.

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

Cloud database migration and seed completed on 2026-10-15. Prisma migrate status reports both migrations applied; Prisma validate passes. The local network cannot reach the provider over IPv6, so the migration process used a resolved IPv4 address with Neon's endpoint routing option and required TLS. This was process-local: no global DNS/hosts changes and no application transport changes. Hosted runtime keeps the pooled provider hostname.

Application deployment completed for commit 30062ca32e497737f8da683d42fa9897a8629eee. 36 checks against the real HTTPS API and 17 native browser checks passed; see PUBLIC_DEPLOYMENT_REPORT.md for exact scope and limitations. Local simulated-proxy checks are reported separately.

PUBLIC_DEPLOYMENT_REPORT.md records the actual URL, deployed application commit, provider configuration, verification scope and remaining limitations.
