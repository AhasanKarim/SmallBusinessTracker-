# Small Business Tracker

A self-hosted finance tracker for a small business. Built for a Halifax photography studio but flexible for any small business.

> **Want to fork it for your own business?** See **[CUSTOMIZATION.md](CUSTOMIZATION.md)** — covers branding, expense categories, payment methods, adding fields, publishing your fork to GitHub, and more.

- Track **income**, **expenses**, **events/jobs**, **receipts**, **invoices**, **documents**, **payment methods**, and **credit cards**.
- Optional Canadian tax tracking (HST/GST/PST), off by default — easy to enable later without breaking data.
- Mobile-friendly. Tap "receipt" on your phone and the camera opens directly.
- Password-protected. Single-user; password is hashed and stored in the DB.
- Runs as a single Docker container with SQLite — small footprint, easy backups (just copy the volume).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript + React 18 |
| Styling | Tailwind CSS 3 |
| Database | SQLite via Prisma ORM (zero external services) |
| Auth | Bcrypt-hashed password + signed JWT cookie (`jose`) |
| File storage | Local filesystem under a Docker volume |
| Container | Multi-stage Alpine build, `node:20-alpine`, ~180 MB |

---

## Quick start with Docker (recommended)

```bash
# 1. Clone or copy this repo, then:
cp .env.example .env
# Edit .env — at minimum set APP_PASSWORD and SESSION_SECRET.

# 2. Build and run
docker compose up -d --build

# 3. Open the app
open http://localhost:3000
```

Sign in with the password from `.env`. The first successful login hashes that password and stores it in the database. After that you can rotate it from **Settings → Change password** and remove `APP_PASSWORD` from your env if you like.

To load the demo photography-studio data on a brand-new install:

```bash
SEED=1 docker compose up -d --build
```

Data is persisted in the named volume `sbt-data` (`/app/data` inside the container) — both the SQLite file and uploaded receipts.

### Backup

```bash
docker run --rm -v sbt-data:/data -v $PWD:/backup alpine \
  tar czf /backup/sbt-backup-$(date +%F).tar.gz -C /data .
```

### Access from your phone on the local network

The container listens on `0.0.0.0:3000`. Find your computer's LAN IP and visit `http://<that-ip>:3000` from your phone. Tap **Add to Home Screen** in your browser to install it as a PWA.

For internet access, put it behind a reverse proxy (Caddy / Cloudflare Tunnel / Tailscale Funnel) — the app sets `secure` cookies when `NODE_ENV=production`.

---

## Local development (without Docker)

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# Edit .env — set APP_PASSWORD and SESSION_SECRET.

# 3. Create the SQLite DB and run migrations
npx prisma migrate dev --name init

# 4. (Optional) Load demo data
npm run seed

# 5. Start the dev server
npm run dev
```

Then visit `http://localhost:3000`.

---

## Configuration

All configuration is via environment variables — see `.env.example` for the full list.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `APP_PASSWORD` | first-run only | `changeme` | Plain text. Hashed and stored on first login. |
| `APP_PASSWORD_HASH` | optional | — | bcrypt hash. Overrides `APP_PASSWORD`. Generate via `npm run hash-password -- 'mypw'`. |
| `SESSION_SECRET` | **yes** | — | 32+ char random. `openssl rand -base64 48` |
| `DATABASE_URL` | yes | `file:./data/app.db` | SQLite path. |
| `UPLOAD_DIR` | yes | `./data/uploads` | Receipt / document storage path. |

---

## Features

### Dashboard
- Total earned, total spent, profit
- Gear vs non-gear totals
- This-month and this-year summaries
- Recent income & expenses
- Spending by category and by credit card

### Events / jobs
- Name, client, date, location, notes
- Invoice total + amount paid → derived status (Unpaid / Partial / Paid)
- Linked income, expenses, and documents
- Payment status auto-updated when income is added

### Income
- Single amount **or** subtotal + tax + total (toggle per row)
- Date, client, payment method (cash / debit / credit card / e-transfer / cheque / other)
- Credit card picker shown only when payment method is "credit card"
- Invoice number, "invoice sent" toggle, optional invoice file upload
- Optional event link

### Expenses
- Same money model (single amount or subtotal + tax)
- Categories: gear, coffee/team food, meals, gas, rides, parking, software, studio rent, props, printing, marketing, other
- Type (gear / non-gear) auto-inferred from category, manually overridable
- Receipt photo / PDF upload — `capture="environment"` opens the rear camera on mobile
- Optional event link (or treated as general business expense)

### Credit cards
- User-managed list — never hardcoded
- Active/inactive flag
- Spend per card shown on the card and on the dashboard
- Deleting a card preserves linked income/expenses (foreign keys set to null)

### Documents
- Receipts, invoices, contracts, other
- Linkable to events / income / expenses
- Image preview thumbnails; PDF / inline view & download
- Files stored on disk in year-month folders with random names

### Reports
- Monthly income / expense / profit table
- Gear vs non-gear totals
- Expenses by category, credit card, payment method
- Income by payment method
- CSV export for income and expenses, scoped by year
- Tax collected / paid / net (only shown when tax is registered)

### Settings
- Business name, country, province, currency
- Tax registered toggle, tax type, default rate
- Change password

---

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
│   │       ├── documents/[id]/file   # serves uploaded files
│   │       └── reports/csv           # CSV export
│   ├── components/           # Sidebar, mobile nav, forms, empty state
│   ├── lib/                  # prisma, auth, session, uploads, utils, constants
│   └── middleware.ts         # gates everything except /login + /api/auth
├── scripts/hash-password.ts  # generate a bcrypt hash from CLI
├── Dockerfile                # multi-stage build, ~180 MB final image
├── docker-compose.yml
└── docker-entrypoint.sh      # runs prisma migrate deploy on start
```

---

## Adapting it for another small business

The full customization guide is in **[CUSTOMIZATION.md](CUSTOMIZATION.md)**. Quick pointers:

- **Categories, payment methods, document types**: edit `src/lib/constants.ts`. The DB stores the raw enum strings; renaming a label is safe.
- **Currency / locale / tax**: change in **Settings → Business profile**. No code changes needed.
- **Branding (name, logo, theme color)**: see [CUSTOMIZATION.md → Branding](CUSTOMIZATION.md#2-branding).
- **Renaming "Events" → "Projects"** or similar: see [CUSTOMIZATION.md → Renaming](CUSTOMIZATION.md#5-renaming-events).
- **Adding a new field or page**: see [CUSTOMIZATION.md → Adding a new field](CUSTOMIZATION.md#6-adding-a-new-field).
- **Multi-user / multi-tenant**: not built in. See sketch in [CUSTOMIZATION.md → Authentication](CUSTOMIZATION.md#8-authentication).

---

## Production hardening checklist

- [ ] Replace `SESSION_SECRET` with `openssl rand -base64 48`.
- [ ] Replace `APP_PASSWORD` with a strong password — the app will hash and store it on first login. Remove `APP_PASSWORD` from your env afterward, or pre-supply `APP_PASSWORD_HASH`.
- [ ] Run behind a TLS reverse proxy (Caddy / Cloudflare Tunnel / Tailscale Funnel).
- [ ] Schedule regular backups of the `sbt-data` volume (or `/app/data`).
- [ ] Set the host clock correctly — JWT expiry depends on it.

---

## License

MIT — see [LICENSE](LICENSE). Use it however you like.

## Contributing

Pull requests welcome. Open an issue first if you want to discuss a non-trivial change. Read [CUSTOMIZATION.md](CUSTOMIZATION.md) before extending the schema or adding new domain concepts.
