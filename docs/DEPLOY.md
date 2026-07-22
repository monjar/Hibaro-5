# Deploying Heliora (browser-only, Fly.io + Neon)

This deploys three apps to [Fly.io](https://fly.io) — the **API**, the **player web app**, and the **admin app** — backed by a managed **Neon** Postgres database. Everything below is doable from a browser; a GitHub Actions workflow does the actual building and deploying, so you never need a terminal, git, or the Fly CLI locally.

## Architecture

| App | Fly app (default name) | URL | Notes |
|---|---|---|---|
| API (NestJS) | `heliora-monjar-api` | `https://heliora-monjar-api.fly.dev` | Always-on — runs the 30s world-tick scheduler |
| Player web (Next.js) | `heliora-monjar-web` | `https://heliora-monjar-web.fly.dev` | Scales to zero when idle |
| Admin (Next.js) | `heliora-monjar-admin` | `https://heliora-monjar-admin.fly.dev` | Its own domain; scales to zero |
| Database | Neon | — | Postgres 16, connection string as a secret |

No Redis is needed — the tick scheduler runs in-process in the API, and the BullMQ worker isn't part of the API.

## One-time setup (all in the browser)

### 1. Neon database
You already created one and have its connection string (`postgresql://...neon.tech/neondb?sslmode=require`). Nothing else to do — migrations and the first-time world seed run automatically on the first deploy.

### 2. Fly.io account + deploy token
1. Sign up at **[fly.io](https://fly.io)** and add a payment method (Fly is pay-as-you-go; this small setup costs roughly a few dollars a month — see [Costs](#costs)).
2. Create a deploy token: **Fly dashboard → Account → [Tokens](https://fly.io/user/personal_access_tokens)** (or **Deploy tokens**) → create one and copy it.

### 3. Add the four GitHub secrets
In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
|---|---|
| `FLY_API_TOKEN` | the Fly token from step 2 |
| `DATABASE_URL` | your Neon connection string |
| `JWT_SECRET` | any long random string (32+ characters) — used to sign login tokens |
| `ADMIN_TOKEN` | any string — gates the admin write endpoints |

> Tip for `JWT_SECRET`: any long random value works. A password-manager "generate password" (40+ chars) is perfect.

### 4. Deploy
Either **merge the deployment PR** (pushing to `master` triggers the workflow), or run it manually: **Actions tab → "Deploy (Fly.io)" → Run workflow** (you can select this branch to test before merging).

The workflow will:
1. Create the three Fly apps if they don't exist.
2. Set the API's secrets (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_TOKEN`, and `CORS_ORIGINS` pointing at the two frontends).
3. Deploy the API — which runs `prisma migrate deploy` and seeds the world **once** (only if the database is empty).
4. Build and deploy the web and admin apps with the API URL baked in.
5. Print the live URLs in the run summary.

First run takes ~5–10 minutes (three Docker builds on Fly's remote builders). Watch progress in the **Actions** tab.

## After it's live

- **Play:** open `https://heliora-monjar-web.fly.dev`. Log in as the seeded account **`test_player` / `Heliora123`**, or register a new operator.
- **Admin:** `https://heliora-monjar-admin.fly.dev`. To use the admin write features, paste your `ADMIN_TOKEN` into the token field at the top of any admin page (or make your player an admin in the database and sign in normally).
- **API health / docs:** `https://heliora-monjar-api.fly.dev/health` and `.../api/docs` (Swagger).

## Redeploys

Every push to `master` re-runs the workflow and redeploys. Migrations apply automatically; the world is **not** re-seeded (the seed only runs on an empty database), so admin edits and player accounts are preserved across deploys.

## Costs

Default sizing: one always-on API machine (`shared-cpu-1x`, 512 MB) plus two frontend machines that sleep when idle. That's roughly a **few dollars a month**, dominated by the always-on API. Neon's free tier covers a small database. To trim further you could lower the API to 256 MB, but 512 MB gives Prisma comfortable headroom.

The API is deliberately always-on (`min_machines_running = 1`, `auto_stop_machines = false` in `fly.api.toml`) because the world-tick scheduler must keep running. Don't set it to scale to zero or the simulation pauses when idle.

## Changing app names or region

The app names and org are the `env:` block in `.github/workflows/deploy.yml`; the region is `primary_region` in each `fly.*.toml` (default `lhr`, London — close to your Neon `eu-west-2` region). If a Fly app name is already taken globally, edit those names (keep them consistent across the workflow env and the three toml files) and re-run.

## Security notes

- The Neon connection string, JWT secret, and admin token live only as GitHub/Fly secrets — never in the repo.
- If your Neon password has been shared anywhere, rotate it in the Neon dashboard and update the `DATABASE_URL` secret; the next deploy picks it up.
- Consider setting a strong, unique `ADMIN_TOKEN` before sharing the site.

## Files involved

- `apps/{api,web,admin}/Dockerfile` — production images (monorepo-aware build).
- `fly.{api,web,admin}.toml` — Fly service config (ports, always-on API, health check, release command).
- `scripts/seed-if-empty.js` — seeds the world only when the DB is empty.
- `.github/workflows/deploy.yml` — the browser-triggered deploy pipeline.
- `.dockerignore` — keeps build contexts small.

## Troubleshooting

- **A Fly app name is taken** → the create step fails; rename the apps (see above).
- **`flyctl apps create` org error** → your Fly org slug isn't `personal`; set `FLY_ORG` in the workflow env to your org slug (find it in the Fly dashboard URL).
- **API deploy fails at the release step** → usually a bad `DATABASE_URL`; re-check the secret. Neon strings must include `?sslmode=require`.
- **Frontend loads but can't reach the API (CORS / network errors)** → confirm the API deployed and that `CORS_ORIGINS` (set by the workflow) matches your frontend URLs; if you changed app names, the frontends must be rebuilt so the new API URL is baked in (just re-run the workflow).
