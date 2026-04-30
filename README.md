# Small Business Tracker

A self-hosted finance tracker for small businesses. Originally built for a Halifax photography studio, designed to flex to any small operation that needs to log money in, money out, and the jobs they belong to.

Forking and customization is documented separately in [CUSTOMIZATION.md](CUSTOMIZATION.md).

## What it does

- Income, expenses, events/jobs, receipts, invoices, contracts, payment methods, and credit cards in one place.
- Optional Canadian tax tracking (HST/GST/PST). Off by default; can be enabled later without breaking existing data.
- Mobile-friendly with native camera capture for receipts.
- Password-protected. Single-user; the password is hashed and stored in the database.
- Light and dark themes.
- CSV export for income and expenses, scoped by year.
- Portable ZIP export/import for moving an entire instance (records, files, settings) to another server. Format documented in [IMPORT_FORMAT.md](IMPORT_FORMAT.md).
- Runs as a single Docker container with SQLite — small footprint, single-file backups.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript + React 18 |
| Styling | Tailwind CSS 3 |
| Database | SQLite via Prisma ORM (no external services) |
| Auth | Bcrypt-hashed password + signed JWT cookie (`jose`) |
| File storage | Local filesystem under a Docker volume |
| Container | Multi-stage Alpine build, `node:20-alpine`, ~180 MB |

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — at minimum APP_PASSWORD and SESSION_SECRET must be set.

docker compose up -d --build
```

Then open `http://localhost:3000` (or whatever host port is mapped in `docker-compose.yml`).

The first successful login hashes the `APP_PASSWORD` value and stores it in the database. From that point on the password lives in the DB and can be rotated from **Settings → Change password**.

To load demo data on a fresh install:

```bash
SEED=1 docker compose up -d --build
```

Persistent data — the SQLite file and uploaded receipts — lives in the named volume `sbt-data` (mounted at `/app/data` inside the container).

### Backup

```bash
docker run --rm -v sbt-data:/data -v $PWD:/backup alpine \
  tar czf /backup/sbt-backup-$(date +%F).tar.gz -C /data .
```

### Mobile / LAN access

The container binds `0.0.0.0:3000`, so any device on the same network can reach `http://<host-ip>:3000`. Browsers offer "Add to Home Screen" to install it as a PWA.

For internet access a TLS reverse proxy is recommended (Caddy, Cloudflare Tunnel, Tailscale Funnel). When serving over HTTPS, set `COOKIE_SECURE=true` so the session cookie is marked `Secure`.

## Local development (without Docker)

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed         # optional demo data
npm run dev
```

## Configuration

All configuration is via environment variables. Full list in `.env.example`.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `APP_PASSWORD` | first run only | `changeme` | Plain text. Hashed and stored on first login. |
| `APP_PASSWORD_HASH` | optional | — | bcrypt hash. Overrides `APP_PASSWORD`. Generate via `npm run hash-password -- 'mypw'`. |
| `SESSION_SECRET` | **yes** | — | 32+ random characters. `openssl rand -base64 48` |
| `DATABASE_URL` | yes | `file:./data/app.db` | SQLite path. |
| `UPLOAD_DIR` | yes | `./data/uploads` | Receipt / document storage path. |
| `COOKIE_SECURE` | optional | `false` | Set to `true` only when serving over HTTPS. |

## Features

**Dashboard** — total earned, total spent, profit, gear vs non-gear totals, monthly and yearly summaries, recent income / expenses, spending by category and credit card.

**Events / jobs** — name, client, location, multi-day date range, notes. Invoice total + amount paid produces a derived status (Unpaid / Partial / Paid). Linked income, expenses, and documents. Payment status auto-updates as income is recorded.

**Income** — single amount or subtotal + tax + total (toggle per row). Date, client, payment method (cash / debit / credit card / e-transfer / cheque / other). Credit-card picker shown only when the method is Credit card; e-transfer recipient email and transaction ID shown only when the method is E-Transfer. Invoice number, "invoice sent" toggle, optional invoice file upload (multiple files supported).

**Expenses** — same money model. Twelve default categories spanning gear (capital) and non-gear (operating) buckets, manually overridable per row. Receipt photo or PDF upload — `capture="environment"` opens the rear camera on mobile. Optional event link, or treated as a general business expense.

**Credit cards** — user-managed list. Active / inactive flag. Per-card spend totals on the card and on the dashboard. Deleting a card preserves linked income and expenses (foreign keys set to null).

**Documents** — receipts, invoices, contracts, other. Linkable to events, income, and expenses. Image thumbnails; PDF inline view and download. Files stored on disk in year-month folders with random names.

**Reports** — monthly income / expense / profit table. Gear vs non-gear totals. Expenses by category, credit card, and payment method. Income by payment method. CSV export scoped by year. Tax collected / paid / net (only when tax tracking is enabled).

**Settings** — business profile, currency, tax configuration, custom logo upload, theme (light / dark / system), password change, data export/import (portable ZIP backup; full format reference in [IMPORT_FORMAT.md](IMPORT_FORMAT.md)).

## Project structure

```
.
├── prisma/
│   ├── schema.prisma         # Models: Event, Income, Expense, CreditCard,
│   │                         # Document, BusinessSettings, AuthCredential
│   └── seed.ts               # Demo photography-studio data
├── src/
│   ├── app/
│   │   ├── (app)/            # All authenticated pages share this layout
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── events/
│   │   │   ├── income/
│   │   │   ├── expenses/
│   │   │   ├── cards/
│   │   │   ├── documents/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── login/page.tsx
│   │   └── api/
│   │       ├── auth/login + logout
│   │       ├── data/export           # downloads ZIP backup
│   │       ├── data/import           # accepts ZIP backup
│   │       ├── documents/[id]/file   # serves uploaded files
│   │       ├── logo                  # serves the custom logo
│   │       └── reports/csv           # CSV export
│   ├── components/           # Sidebar, mobile nav, forms, toaster, theme toggle
│   ├── lib/                  # prisma, auth, session, uploads, utils, constants, flash
│   └── middleware.ts         # gates everything except /login + /api/auth
├── scripts/hash-password.ts  # generate a bcrypt hash from CLI
├── Dockerfile                # multi-stage build, ~180 MB final image
├── docker-compose.yml
└── docker-entrypoint.sh      # runs prisma db push on start
```

## Customization

The full guide is [CUSTOMIZATION.md](CUSTOMIZATION.md). Highlights:

- Branding — name, logo, brand color, favicon: [Branding](CUSTOMIZATION.md#2-branding)
- Expense categories and payment methods: [Categories](CUSTOMIZATION.md#3-expense-categories) · [Payment methods](CUSTOMIZATION.md#4-payment-methods)
- Renaming "Events" to fit a different domain: [Renaming](CUSTOMIZATION.md#5-renaming-events)
- Adding a new field or page: [New field](CUSTOMIZATION.md#6-adding-a-new-field) · [New page](CUSTOMIZATION.md#7-new-page-or-model)
- Environment variables and HTTPS: [Env vars](CUSTOMIZATION.md#9-environment-variables) · [Public internet](CUSTOMIZATION.md#12-public-internet)

## Production hardening checklist

- [ ] `SESSION_SECRET` set to `openssl rand -base64 48`.
- [ ] `APP_PASSWORD` set to a strong value (or pre-hashed via `APP_PASSWORD_HASH`).
- [ ] App served behind a TLS reverse proxy.
- [ ] `COOKIE_SECURE=true` once HTTPS is in place.
- [ ] Daily backups of the `sbt-data` volume (or `/app/data`) scheduled.
- [ ] Host clock synced — JWT expiry depends on it.

## License

MIT. See [LICENSE](LICENSE).

## Contributing

Pull requests welcome. For non-trivial changes, opening an issue first to discuss the approach is appreciated. [CUSTOMIZATION.md](CUSTOMIZATION.md) is the recommended starting point before extending the schema or adding new domain concepts.
