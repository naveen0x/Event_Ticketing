# Event Ticketing

A production-ready web application for managing event registrations, attendee
approvals, QR-code tickets, email invitations, and on-site attendance scanning.

## Workflow

```
Admin creates/configures event
        v
Admin shares the event's registration link
        v
Attendee submits the registration form  ->  Registration stored as PENDING
        v
Admin reviews the registration in the dashboard
        v
Admin APPROVES or REJECTS
        v
On approval:
  - a unique ticket (ticket code + QR token) is generated
  - a digital ticket email is sent via SMTP with the QR code embedded
        v
Attendee presents the QR code (email or the /ticket/[code] page) at the venue
        v
Admin scans the QR code from the admin dashboard
        v
System looks up the ticket/attendee and shows their details
        v
Admin confirms and marks the attendee ATTENDED (timestamped, attributed to the admin)
```

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) credentials auth for admins, JWT sessions
- `qrcode` for QR generation, `html5-qrcode` for camera-based scanning
- `nodemailer` for SMTP email delivery

## Getting started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already set in
`.env.example` (`postgres` / `postgres`, database `event_ticketing`). If you'd
rather use an existing Postgres instance, just point `DATABASE_URL` at it.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in real values for production use, in particular:

- `AUTH_SECRET` — generate with `openssl rand -hex 32`
- `APP_URL` / `NEXTAUTH_URL` — the public URL the app is served from
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the first admin account (see below)

SMTP is **not** configured here — see step 5.

### 3. Install dependencies, run migrations, seed the first admin

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:seed` creates (or updates) one `SUPER_ADMIN` account from the
`SEED_ADMIN_*` env vars. Sign in with those credentials, then use
**Admins** in the dashboard nav to create additional admin/organizer
accounts — change the seeded password afterwards.

### 4. Run the app

```bash
npm run dev
```

- `/` — landing page
- `/login` — admin sign in
- `/admin` — admin dashboard (protected)
- `/events/[slug]` and `/events/[slug]/register` — public event page & registration form
- `/ticket/[ticketCode]` — an attendee's digital ticket

### 5. Configure SMTP from the dashboard

Sign in as the seeded `SUPER_ADMIN`, then go to **Email** in the nav
(`/admin/settings/smtp`) and enter your SMTP provider's host, port, username,
password, and from address. Settings are stored in the database (`SmtpSettings`
table), not in `.env` — no redeploy needed to change them, and they're only
readable/writable by `SUPER_ADMIN` accounts. Use **Send test email** to verify
before saving. Until this is configured, ticket/rejection emails will fail
silently (logged server-side; the approval itself still succeeds).

## Admin workflow

1. **Create an event** from `/admin` → *Create event*. This generates a slug
   and a shareable public registration link, shown on the event detail page.
2. **Share the link** (`/events/<slug>`) with prospective attendees.
3. **Review registrations** on the event detail page — filter by
   Pending / Approved / Rejected, then **Approve** or **Reject** each one.
   Approving generates the ticket, QR code, and emails it to the attendee;
   rejecting can include a reason that's emailed to them.
4. **Scan tickets** at the venue from *Scan tickets* — uses the device
   camera to read the QR code, looks up the attendee, and lets the admin
   confirm check-in. Browsers only allow camera access over HTTPS or on
   `localhost`. Testing from your own machine at `http://localhost:3000`
   works as-is; testing from a phone/tablet over plain HTTP (e.g. your LAN
   IP) will fail with "Could not access the camera" even after granting
   permission. For that, run `npm run dev:https` instead (generates a
   self-signed cert; accept the browser's certificate warning on the other
   device) — in production this isn't an issue since the app is served over
   HTTPS anyway.
5. **Attendance** shows all approved attendees with search and manual
   check-in/undo, for cases where scanning isn't practical.

## Notes on production readiness

- Admin routes (`/admin/**`) are protected by proxy-level auth (redirects
  unauthenticated users to `/login`) **and** every API route re-checks the
  session server-side — the UI guard is not the only line of defense.
  A `SUPER_ADMIN` role gates admin management; `ORGANIZER` covers day-to-day use.
- Passwords are hashed with bcrypt; sessions are signed JWTs.
- QR tickets embed a 256-bit random, unguessable bearer token
  (`Ticket.qrToken`) that's looked up directly in the database — nothing
  about a ticket can be derived from the code itself.
- Registration is idempotent per (event, email) via a unique DB constraint,
  and capacity is enforced both at registration and at approval time.
- Failure to send the ticket email doesn't fail the approval — check server
  logs (`Ticket.emailSentAt` is `null` if delivery failed) and consider
  adding a retry/resend action if this matters for your deployment.
- SMTP credentials are stored in plaintext in the `smtp_settings` table,
  readable only by `SUPER_ADMIN` accounts through the app. This avoids an
  extra encryption-key secret to manage, but means database access controls
  (and backups) matter — treat DB access with the same care as `.env` secrets
  would get.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / start |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed the first `SUPER_ADMIN` |
| `npm run db:studio` | Open Prisma Studio |
