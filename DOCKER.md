# Docker deployment guide

This guide covers running Event Ticketing entirely in Docker — app and
database both as containers — from a fresh server to a working, publicly
reachable installation.

It has been tested end-to-end: image build, automatic migrations, admin
login, event creation, public registration, approval + ticket/QR generation,
and the ticket page, all verified running inside the containers described
here.

## Contents

- [How it's built](#how-its-built)
- [Prerequisites](#prerequisites)
- [1. Get the code onto the server](#1-get-the-code-onto-the-server)
- [2. Configure environment variables](#2-configure-environment-variables)
- [3. Build and start the stack](#3-build-and-start-the-stack)
- [4. Create the first admin](#4-create-the-first-admin)
- [5. Put HTTPS in front of it](#5-put-https-in-front-of-it)
- [6. Firewall](#6-firewall)
- [7. First login checklist](#7-first-login-checklist)
- [Day-2 operations](#day-2-operations)
- [Troubleshooting](#troubleshooting)
- [Environment variable reference](#environment-variable-reference)

## How it's built

Three files drive this:

| File | Purpose |
| --- | --- |
| `Dockerfile` | Multi-stage build (`deps` → `builder` → `runner`) producing the app image, based on `node:22-slim`. |
| `docker-entrypoint.sh` | Container entrypoint — runs `prisma migrate deploy` against the database, then starts the server. Runs on every container start, not just the first. |
| `docker-compose.prod.yml` | Runs the app image together with a Postgres container, wired together on a private Docker network. |

A deliberate choice worth knowing about: the image ships the app's **full**
`node_modules`, not a trimmed Next.js `standalone` build. That's specifically
so the Prisma CLI (a devDependency, needed to run migrations) is available
inside the running container — Next's standalone output only bundles what
the app's own code actually imports at runtime, which doesn't include the
`prisma` CLI package, so a trimmed image can't self-migrate. The image is
larger as a result; for this app's scale that's a reasonable trade for a
container that migrates itself on every start with zero extra steps.

There's also a separate `docker-compose.yml` at the repo root — that one is
for **local development only** (Postgres alone, no app container; you run
`npm run dev` against it). Don't confuse the two; this guide only uses
`docker-compose.prod.yml`.

## Prerequisites

- A Debian (or other Linux) server with Docker installed:

  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER   # log out and back in after this
  ```

  (The Docker Engine install above already includes the `docker compose`
  plugin — no separate install needed.)
- A domain name pointed at the server's IP address (an A record). Not
  strictly required to get the app running, but required for step 5
  (HTTPS), and HTTPS is required for the QR scanner to work anywhere other
  than `localhost`.

## 1. Get the code onto the server

```bash
git clone <your-repo-url> /opt/event-ticketing
cd /opt/event-ticketing
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
AUTH_SECRET="$(openssl rand -hex 32)"          # generate a real one — don't ship the placeholder
NEXTAUTH_URL="https://your-domain.com"
APP_URL="https://your-domain.com"
SEED_ADMIN_EMAIL="you@your-domain.com"
SEED_ADMIN_PASSWORD="<something strong>"
```

Leave `DATABASE_URL` exactly as it is in `.env.example`.
`docker-compose.prod.yml` overrides it at container-start time to point at
the `db` service (`db:5432`) rather than `localhost` — inside the Docker
network, the database isn't reachable at `localhost`, it's reachable by its
service name. You don't need to edit this yourself.

SMTP is **not** set here at all — see [step 7](#7-first-login-checklist).

## 3. Build and start the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the image (a fresh build takes a few minutes — installing
dependencies and running `next build`), then starts both containers. Watch
it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

You should see the entrypoint apply migrations, then the Next.js server
report ready:

```text
Applying database migrations...
...
All migrations have been successfully applied.
▲ Next.js 16.3.4
✓ Ready in 353ms
```

Ctrl+C to stop following logs (this doesn't stop the container). Confirm
both containers are healthy:

```bash
docker compose -f docker-compose.prod.yml ps
```

## 4. Create the first admin

```bash
docker compose -f docker-compose.prod.yml exec app npm run db:seed
```

This creates (or updates) one `SUPER_ADMIN` account from the
`SEED_ADMIN_*` values in `.env`. It's safe to re-run — it upserts by email
rather than duplicating.

At this point `curl http://localhost:3000` from the server itself should
return the landing page. It isn't reachable from the outside world yet on
purpose — that's what the next step is for.

## 5. Put HTTPS in front of it

**This step is not optional.** Browsers only allow camera access
(`getUserMedia`, which the QR scanner depends on) over HTTPS or on
`localhost`. Without a real TLS certificate, the scanner will fail for
every device except one sitting at the server's own `localhost` — i.e. it
won't work for admins at the actual venue.

The app listens on port 3000 inside its container, published to the host
by `docker-compose.prod.yml`. Point a reverse proxy at
`127.0.0.1:3000` and terminate TLS there — the app itself doesn't and
shouldn't handle certificates.

**Nginx + Let's Encrypt:**

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/event-ticketing > /dev/null <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/event-ticketing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com   # issues a cert and sets up auto-renewal
```

Prefer not to install Nginx on the host at all? A `caddy` container with
its own compose service (Caddy handles Let's Encrypt automatically, no
certbot needed) works just as well — not included here to keep this guide
to one reverse-proxy option, but the app side of the setup (proxy to
`127.0.0.1:3000`) is identical either way.

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens 80 + 443
sudo ufw enable
```

Port 3000 (the app) should not be reachable from the internet directly —
only through the reverse proxy. It's fine that Docker publishes it to the
host (`127.0.0.1:3000` and the server's own IP); the firewall is what
actually keeps it from being reachable externally. Postgres's port is not
published to the host at all in `docker-compose.prod.yml` (unlike the
dev-only `docker-compose.yml`), so there's nothing to firewall there.

## 7. First login checklist

1. Visit `https://your-domain.com` — should load over a real, trusted
   certificate (no browser warning).
2. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Go to **Admins** in the nav and change that seeded password (or create
   your real account there and deactivate the seed one).
4. Go to **Email** in the nav and configure SMTP — host, port, username,
   password, from address. Use **Send test email** before saving. Settings
   live in the database, not `.env`, so changing them later doesn't need a
   rebuild or restart.
   - If your mail server uses a self-signed certificate, you'll see
     `self-signed certificate` as the test error — check **Allow
     self-signed certificate** on that same page (off by default; only
     enable it for a mail server you trust).
5. Create a test event, register on its public link, approve the
   registration, confirm the ticket email arrives, and test the scanner
   from a phone (this is where the HTTPS setup pays off).

## Day-2 operations

**Redeploy after a code change:**

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations run automatically as part of container startup — no separate
migrate step needed.

**View logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f db
```

**Run a one-off command inside the app container** (e.g. re-seed, open
Prisma Studio):

```bash
docker compose -f docker-compose.prod.yml exec app npm run db:seed
docker compose -f docker-compose.prod.yml exec app npm run db:studio  # then tunnel/forward the port to view it
```

**Connect to the database directly:**

```bash
docker compose -f docker-compose.prod.yml exec db psql -U postgres event_ticketing
```

**Back up the database:**

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres event_ticketing > backup-$(date +%F).sql
```

**Restore from a backup:**

```bash
cat backup-2026-01-01.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres event_ticketing
```

**Stop everything** (keeps data — the Postgres volume persists):

```bash
docker compose -f docker-compose.prod.yml down
```

**Stop and delete all data** (careful — irreversible):

```bash
docker compose -f docker-compose.prod.yml down -v
```

## Troubleshooting

**`UntrustedHost` errors in the app logs, sign-in silently fails** — this
was a real bug caught while building this guide, already fixed in
`src/auth.config.ts` (`trustHost: true`). Auth.js v5 only auto-trusts the
request host on Vercel; self-hosted deployments need it set explicitly. If
you're on an older checkout without this fix, pull the latest and rebuild.

**Build fails during `npm ci` with an `ERESOLVE`/peer-dependency error** —
should be fixed by the repo's `.npmrc` (`legacy-peer-deps=true`). If you
don't have that file, add it — `next-auth`'s peer range for `nodemailer`
doesn't match the pinned version this project uses, and current npm
enforces peer ranges strictly by default even with a lockfile present.

**`prisma migrate deploy` fails on startup** — check `docker compose logs
app` for the actual Prisma error. Most often this means `DATABASE_URL`
doesn't point at a reachable database; confirm the `db` container is
healthy (`docker compose -f docker-compose.prod.yml ps`) before the `app`
container starts (compose's `depends_on: condition: service_healthy`
should already enforce this ordering).

**QR scanner says "Could not access the camera"** — almost always means
you're not actually on HTTPS yet, or the certificate isn't trusted by that
device. Confirm step 5 is actually in place; the app has no way to work
around a browser's camera permission requirements.

**Ticket emails aren't arriving** — check `docker compose logs app` for a
`Failed to send ticket email` line; the approval itself still succeeds even
if delivery fails (`Ticket.emailSentAt` stays `null`). Revisit SMTP
settings from the admin UI and use **Send test email** to isolate the
problem before re-approving anyone.

## Environment variable reference

| Variable | Set to | Notes |
| --- | --- | --- |
| `DATABASE_URL` | leave as-is | overridden by `docker-compose.prod.yml` |
| `AUTH_SECRET` | `openssl rand -hex 32` | signs session JWTs — keep it secret, don't reuse across environments |
| `NEXTAUTH_URL` | `https://your-domain.com` | must match how the app is actually reached |
| `APP_URL` | `https://your-domain.com` | used to build links in ticket/registration emails |
| `SEED_ADMIN_NAME` | e.g. `Admin` | only used by `npm run db:seed` |
| `SEED_ADMIN_EMAIL` | your email | first `SUPER_ADMIN` account |
| `SEED_ADMIN_PASSWORD` | a strong password | change it after first login |

SMTP is intentionally not an environment variable — it's configured from
the admin UI (Admin → Settings → Email) and stored in the database, so it
can be changed without a redeploy.
