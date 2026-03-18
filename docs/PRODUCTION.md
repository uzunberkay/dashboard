# Production Runbook (Vercel + Neon)

## Target Architecture

- `main` branch deploys to Vercel Production.
- `staging` branch deploys to a long-lived Vercel Preview URL.
- Neon has a persistent `staging` branch and a production/default branch.
- Prisma runtime uses pooled `DATABASE_URL`; Prisma CLI uses `DIRECT_URL`.

## Environment Contract

### Required in all environments

- `DATABASE_URL=postgresql://...` (pooled connection)
- `DIRECT_URL=postgresql://...` (direct/unpooled connection for Prisma CLI)
- `NEXTAUTH_SECRET=<long-random-secret>`
- `APP_ENV=development|staging|production`
- `ENABLE_DEMO_SEED=true|false`
- `RATE_LIMIT_LOGIN_MAX=5`
- `RATE_LIMIT_LOGIN_WINDOW_MS=600000`
- `RATE_LIMIT_MUTATION_MAX=60`
- `RATE_LIMIT_MUTATION_WINDOW_MS=60000`

### `NEXTAUTH_URL` rules

- Production: always required, for example `https://your-domain.example`.
- Development (local): required, for example `http://localhost:3000`.
- Staging: optional only when Vercel system vars provide a host (`VERCEL_BRANCH_URL` or `VERCEL_URL`).

## One-Time Platform Setup

1. Connect the GitHub repository to Vercel.
2. Keep `main` as the production branch.
3. Create and use `staging` as the release-gated branch.
4. Enable Vercel system environment variables exposure.
5. Install Neon Managed Integration with Vercel.
6. In Neon, create a persistent `staging` DB branch from production/default.
7. Configure Vercel environment variables:
- Preview-wide base:
`APP_ENV=staging`, `ENABLE_DEMO_SEED=false`, `NEXTAUTH_SECRET=<staging-secret>`, rate-limit vars.
- Preview-wide Prisma safety (for non-staging preview Prisma checks):
`DIRECT_URL=<preview-safe direct url>`.
- `staging` branch overrides:
`DATABASE_URL=<staging pooled>`, `DIRECT_URL=<staging unpooled>`.
- Production:
`DATABASE_URL=<prod pooled>`, `DIRECT_URL=<prod unpooled>`, `NEXTAUTH_SECRET=<prod secret>`, `NEXTAUTH_URL=https://<prod-domain>`, `APP_ENV=production`, `ENABLE_DEMO_SEED=false`, rate-limit vars.

## Staging Validation Flow

1. Push target commit to `staging` branch.
2. Run preflight with staging preview env:

```bash
vercel env run -e preview --git-branch staging -- npm run env:check
vercel env run -e preview --git-branch staging -- npm run db:deploy
vercel env run -e preview --git-branch staging -- npm run build
```

3. Run staging smoke on the staging URL using a fresh account from `/register`.
4. Verify `GET /api/health` returns `200` and includes:
- `status: "ok"`
- `database: "reachable"`

### Smoke Checklist

- Register, login, logout
- Transaction create, update, delete
- Category create, update, reorder, delete
- Goal create, update, delete
- Dashboard and budgets data loading
- Transaction pagination (`page` query)

## Production Rollout Flow

1. Promote the same validated commit from `staging` to `main` (manual promote).
2. Run production preflight:

```bash
vercel env run -e production -- npm run env:check
vercel env run -e production -- npm run db:deploy
vercel env run -e production -- npm run build
```

3. Deploy production and verify `/api/health` again.
4. Monitor logs and auth/CRUD key paths after release.

## Rollback

1. Roll back to the previous healthy Vercel deployment.
2. If migration-related, recover Neon DB via backup or PITR.
3. Re-check `/api/health`.
4. Re-run smoke tests on the restored release.

## Release Blocker

- Production go-live stays blocked until in-memory rate limiting is replaced with a shared store (for example Redis/Upstash/KV) and revalidated in staging.
