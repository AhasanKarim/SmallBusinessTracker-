# Make It Your Own — Customization Guide

This is a self-hosted finance tracker. The defaults assume a **Canadian photography studio**, but the app is built to be reshaped for any small business — a freelance designer, a food-truck operator, a contractor, a consultant, anything where you log money in, money out, and (optionally) jobs.

This guide covers everything you can change, from no-code tweaks in the Settings page to deeper code customization. Each section is self-contained — read only the parts you care about.

> **Tip:** before changing code, make sure you can build the app once cleanly. See the [README](README.md) for install + Docker setup.

---

## Contents

1. [Things you can change without touching code](#1-no-code-changes)
2. [Branding (name, logo, colors, favicon)](#2-branding)
3. [Adapting expense categories](#3-expense-categories)
4. [Adapting payment methods](#4-payment-methods)
5. [Renaming "Events" — picking a different domain word](#5-renaming-events)
6. [Adding a new field to income or expense](#6-adding-a-new-field)
7. [Adding a brand-new page or model](#7-new-page-or-model)
8. [Authentication (password, multi-user)](#8-authentication)
9. [Environment variables — the full list](#9-environment-variables)
10. [File storage location](#10-file-storage)
11. [Tax behavior](#11-tax-behavior)
12. [Putting it on the public internet (HTTPS)](#12-public-internet)
13. [Backups, restores, moving servers](#13-backups-and-migration)
14. [Publishing your fork to GitHub safely](#14-publishing-to-github)
15. [FAQ & troubleshooting](#15-faq)

---

## 1. No-code changes

Sign in and go to **Settings**. Everything below can be changed without touching a single file.

| Change | Where |
| --- | --- |
| Business name (shown in sidebar) | Settings → Business profile → Business name |
| Logo (sidebar + mobile bar) | Settings → Logo → Upload |
| Light / Dark / System theme | Settings → Appearance |
| Currency (CAD, USD, EUR, GBP…) | Settings → Business profile → Currency |
| Country & province | Settings → Business profile |
| Tax tracking on/off, type, rate | Settings → Tax tracking |
| Password | Settings → Change password |
| Credit cards you use | Cards page |

These are stored in the database, so they survive container rebuilds and code updates.

---

## 2. Branding

### Business name
Set it in **Settings → Business profile → Business name**. It shows in the sidebar, mobile top bar, and the browser tab is independent (see below).

### Logo
**Settings → Logo → Upload**. Square images render best. Stored in the upload volume, so it survives container rebuilds. The logo replaces the default house-icon mark in the sidebar and mobile top bar.

### Browser tab title
Edit `src/app/layout.tsx`:
```ts
export const metadata: Metadata = {
  title: "Small Business Tracker",      // ← change this
  description: "Track income, expenses…",
  manifest: "/manifest.webmanifest",
};
```

### "Add to Home Screen" PWA name
Edit `public/manifest.webmanifest`:
```json
{
  "name": "Small Business Tracker",
  "short_name": "SB Tracker",
  ...
}
```

### Brand color
The whole UI uses Tailwind's `brand-*` palette (currently a blue). Edit `tailwind.config.ts`:
```ts
colors: {
  brand: {
    50:  "#f3f7ff",
    100: "#e6efff",
    200: "#c5d8ff",
    300: "#9ab8ff",
    400: "#6890ff",
    500: "#3a68f5",
    600: "#264bd1",   // ← primary buttons, links, active nav
    700: "#1f3ba6",
    800: "#1c3380",
    900: "#1a2c66",
  },
},
```

Pick any 50–900 ramp. [Tailwind's default palette](https://tailwindcss.com/docs/customizing-colors) is a good source — copy any of the named colors (e.g. `emerald`, `rose`, `violet`) into the `brand` slot. Rebuild the container after editing.

The `themeColor` (mobile browser chrome color) is set in `src/app/layout.tsx`:
```ts
themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#264bd1" },  // brand-600
  { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
],
```

### Favicon
Replace `public/favicon.svg` with your own SVG. PNG works too — name it `favicon.png` and it'll be auto-detected.

### Login page wording
Edit `src/app/login/page.tsx`:
```tsx
<h1 className="text-lg font-semibold">Small Business Tracker</h1>
<p className="text-sm text-slate-500">Enter your password to continue</p>
```

---

## 3. Expense categories

Categories live in **`src/lib/constants.ts`** so the schema stays untouched as you tweak the list.

```ts
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; type: "GEAR" | "NON_GEAR" }[] = [
  { value: "GEAR",             label: "Gear",                       type: "GEAR" },
  { value: "COFFEE_TEAM_FOOD", label: "Coffee / team food",         type: "NON_GEAR" },
  { value: "MEALS",            label: "Meals",                      type: "NON_GEAR" },
  // ...
];
```

### Add a new category
Append a new entry. The `value` is what gets stored in the DB — pick an UPPER_SNAKE_CASE token and don't change it later (or you'd need to migrate existing rows). The `label` is what appears in the UI — change it freely.

```ts
{ value: "INSURANCE", label: "Insurance", type: "NON_GEAR" },
```

Update the union type at the top of the file too:
```ts
export type ExpenseCategory =
  | "GEAR"
  | "COFFEE_TEAM_FOOD"
  | ...
  | "INSURANCE";   // ← add it
```

That's it — no DB migration needed. New entries appear in the dropdown immediately.

### Rename a category label
Just change the `label`. The `value` is what's stored in the DB; existing rows will start showing the new label everywhere.

### Remove a category
Delete the entry. Existing rows in that category will still display their stored value (e.g. `"INSURANCE"`) instead of a label. If you have existing data, it's safer to leave the entry in place and just hide it from the picker.

### "Gear" vs "Non-gear"
This is the report split (capital purchases vs operating expenses). For a non-photography business, you can rename this in the report headings (search for `"Gear"` and `"Non-gear"` in `src/app/(app)/reports/page.tsx` and `src/app/(app)/page.tsx`) and just treat it as your own two-bucket split, OR set every category's `type` to `"NON_GEAR"` and remove the gear stat from the dashboard.

---

## 4. Payment methods

Same file, `src/lib/constants.ts`:

```ts
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH",       label: "Cash" },
  { value: "DEBIT",      label: "Debit" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "ETRANSFER",  label: "E-Transfer" },
  { value: "CHEQUE",     label: "Cheque" },
  { value: "OTHER",      label: "Other" },
];
```

### Region-specific renames

**United States** — replace `ETRANSFER` → `ZELLE` / `VENMO`, `CHEQUE` → `CHECK`. Keep the same `value`s if you have existing data, just change the `label`.

**United Kingdom** — `ETRANSFER` → `BANK_TRANSFER`, `DEBIT` → `BACS`, `CHEQUE` → `CHEQUE`.

**Add a new one (e.g. PayPal)**:

```ts
{ value: "PAYPAL", label: "PayPal" },
```

…and add `"PAYPAL"` to the `PaymentMethod` union type.

### Special handling for E-transfer
Income forms show extra fields (recipient email, transaction ID) only when the method is `ETRANSFER`. If you rename it to e.g. `ZELLE`, also rename the conditionals in `src/components/IncomeForm.tsx` (search for `paymentMethod === "ETRANSFER"`) and the action in `src/app/(app)/income/actions.ts` (search for `isEtransfer`).

---

## 5. Renaming "Events"

If "Events" doesn't fit your business (you might prefer "Projects", "Jobs", "Sessions", "Clients"), the cheapest rename is **labels only** — the database model stays `Event` but every visible string changes.

Find-and-replace these visible labels:

| In file | Find | Replace with (example) |
| --- | --- | --- |
| `src/components/Nav.tsx` | `"Events"` (NAV_ITEMS) | `"Projects"` |
| `src/app/(app)/events/page.tsx` | `"Events / Jobs"`, `"New event"`, `"+ New event"` | etc |
| `src/app/(app)/events/[id]/page.tsx` | `"Edit event"`, `"Delete event"` | etc |
| Form labels everywhere | `"Event name"`, `"Linked event"`, `"Event date"` | `"Project name"`, `"Linked project"`, `"Project start date"` |

The URL stays `/events`. If you want `/projects` in the URL too, rename the directory:

```bash
git mv src/app/\(app\)/events src/app/\(app\)/projects
# then update every Link href and revalidatePath() string in the codebase:
grep -rn '/events' src/  # adjust each match
```

**Going further** (renaming the Prisma `Event` model itself) is doable but means a DB migration and changing every relation reference. Only worth it if you're starting fresh with no data.

---

## 6. Adding a new field

Three steps — schema, form, display.

### Example: add `clientPhone` to Income

**Step 1 — Schema** (`prisma/schema.prisma`):
```prisma
model Income {
  // ...
  clientName     String?
  clientPhone    String?    // ← add this
  // ...
}
```

**Step 2 — Form** (`src/components/IncomeForm.tsx`) — add an input next to clientName:
```tsx
<div>
  <label className="label">Client phone</label>
  <input name="clientPhone" defaultValue={initial?.clientPhone ?? ""} className="input" />
</div>
```

Update the local `IncomeData` type at the top of the file:
```ts
type IncomeData = {
  // ...
  clientName: string | null;
  clientPhone: string | null;   // ← add
  // ...
};
```

**Step 3 — Action** (`src/app/(app)/income/actions.ts`) — read the form value and pass it through:
```ts
await prisma.income.create({
  data: {
    // ...
    clientName: optStr(formData.get("clientName")),
    clientPhone: optStr(formData.get("clientPhone")),  // ← add (in both create and update)
    // ...
  },
});
```

**Step 4 (optional) — Show it in the list** (`src/app/(app)/income/page.tsx`) — the field is now stored, but won't appear in lists/exports until you add it explicitly. Drop it into the table cell next to clientName, or into the CSV export at `src/app/api/reports/csv/route.ts`.

Restart the container — `prisma db push` will add the column automatically.

---

## 7. Adding a brand-new page or model

### Just a new page (no DB changes)

Create `src/app/(app)/<your-page>/page.tsx`:
```tsx
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function MyNewPage() {
  return (
    <>
      <PageHeader title="My new page" description="Describe it" />
      <p>Content here</p>
    </>
  );
}
```

Add it to the sidebar in `src/components/Nav.tsx`:
```ts
const NAV_ITEMS = [
  // ...
  { href: "/my-new-page", label: "My new page", icon: IconCog },
];
```

(Pick any of the existing icons or add your own — they're inline SVGs at the bottom of `Nav.tsx`.)

### A new model (e.g. "Clients")

**Schema** (`prisma/schema.prisma`):
```prisma
model Client {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Server actions** at `src/app/(app)/clients/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { setFlash } from "@/lib/flash";

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) { setFlash("Name required", "error"); return; }
  await prisma.client.create({
    data: {
      name,
      email: String(formData.get("email") ?? "") || null,
    },
  });
  setFlash("Client added");
  revalidatePath("/clients");
}
```

**List page** at `src/app/(app)/clients/page.tsx` — copy `events/page.tsx` as a template; it has the standard list + create-form pattern.

**Sidebar entry** in `src/components/Nav.tsx`.

The flash toast at `setFlash()` will surface automatically — no extra wiring.

---

## 8. Authentication

### Single-user (default)
Set `APP_PASSWORD` in `.env` for the **first run only**. The app hashes it with bcrypt and stores it in the DB. After that you can:
- Remove `APP_PASSWORD` from `.env`
- Change it from **Settings → Change password**

### Pre-supplying a hashed password
Generate a hash on any machine with this repo cloned:
```bash
npm run hash-password -- 'your-strong-password'
# prints: $2a$12$...
```
Set `APP_PASSWORD_HASH=$2a$12$...` in `.env` instead of `APP_PASSWORD`. Same first-run behavior, but the plaintext never leaves your laptop.

### Multi-user (sketch)
This isn't built in. Roughly: add a `User` model with email + passwordHash, add a `userId` foreign key on `Event`, `Income`, `Expense`, `CreditCard`, `Document`. Replace the single-cookie middleware in `src/middleware.ts` with a per-user JWT containing the userId. Filter every Prisma query by `userId`. It's a real chunk of work — only worth doing if you're going to host a SaaS version.

---

## 9. Environment variables

Full list — also documented in `.env.example`.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `APP_PASSWORD` | first run | — | Plaintext password. Hashed and persisted on first successful login. |
| `APP_PASSWORD_HASH` | optional | — | Pre-hashed bcrypt password. Overrides `APP_PASSWORD`. |
| `SESSION_SECRET` | **yes** | — | 32+ char random string. Signs session cookies. `openssl rand -base64 48`. |
| `DATABASE_URL` | yes | `file:./data/app.db` | SQLite file path. Inside Docker: `file:/app/data/app.db`. |
| `UPLOAD_DIR` | yes | `./data/uploads` | Where receipt and logo files go. Inside Docker: `/app/data/uploads`. |
| `COOKIE_SECURE` | optional | `false` | Set to `true` ONLY when serving over HTTPS. Browsers refuse `Secure` cookies on plain HTTP. |
| `SEED` | optional | `0` | Set to `1` for one container start to load demo data. |

In `docker-compose.yml`, every variable can be set inline or referenced from a `.env` file in the same directory.

---

## 10. File storage

Uploads (receipts, invoices, logo) are stored under `UPLOAD_DIR` (default `./data/uploads`). Inside the Docker container that's `/app/data/uploads`, mounted from the named volume `sbt-data`.

Files are organized by year-month: `data/uploads/2026-04/<random>.jpg`. The DB stores only the relative storage key.

### Move uploads to S3 / external storage
Replace the body of `saveUpload` / `readUpload` / `deleteUpload` in `src/lib/uploads.ts` with calls to the S3 SDK. Storage keys remain the relative paths — you never need a DB migration.

### Use a different mount point
If you want uploads on a different disk on the host, change the volume binding in `docker-compose.yml`:
```yaml
volumes:
  - /mnt/big-disk/sbt-uploads:/app/data
```
This binds your host directory directly instead of using a Docker-managed volume. Easier for backups but less portable.

---

## 11. Tax behavior

By default tax is **off**. Forms show a single "Amount" field. Reports don't show tax sums.

Turn it on in **Settings → Tax tracking → I am registered to collect tax**. Forms now offer a "Use subtotal + tax" toggle. Reports show *Tax collected*, *Tax paid*, *Net tax estimate*.

### Change the available tax types
Edit the `<select name="taxType">` in `src/app/(app)/settings/page.tsx`. The options are display-only — the value is stored as a string, no schema change needed.

### Default tax rate
Set in Settings. Currently it's a number you can store, but it's not auto-applied to forms. To auto-fill the tax field based on subtotal, edit `src/components/IncomeForm.tsx` / `ExpenseForm.tsx` and add an `onChange` that computes `taxAmount = subtotal * defaultTaxRate`.

---

## 12. Public internet

The container binds `0.0.0.0:3000` so it's reachable from your LAN. To expose it to the internet **safely**:

### Option A — Caddy (simplest, automatic HTTPS)
On the same server, add a `Caddyfile`:
```
your.domain.com {
    reverse_proxy localhost:3030
}
```
Run `caddy run`. Caddy fetches a Let's Encrypt cert automatically. Then in your `.env`, set `COOKIE_SECURE=true` and rebuild the container.

### Option B — Cloudflare Tunnel
No port forwarding needed. Install `cloudflared`, run:
```
cloudflared tunnel --url http://localhost:3030
```
Cloudflare gives you a public URL with HTTPS. Set `COOKIE_SECURE=true`.

### Option C — Tailscale Funnel
If everything else is on Tailscale already:
```
tailscale funnel 3030
```

### When to set `COOKIE_SECURE=true`
**Only** when the user reaches the app over HTTPS. On plain HTTP, browsers silently drop cookies marked `Secure` and login appears to fail (the page just bounces back to /login). For LAN access over `http://...`, leave it `false`.

---

## 13. Backups and migration

### Daily backup (cron)
Save as `/etc/cron.daily/sbt-backup` and `chmod +x`:
```sh
#!/bin/sh
DEST=/home/medusa/sbt-backups
mkdir -p "$DEST"
docker run --rm \
  -v sbt-data:/data \
  -v "$DEST":/backup \
  alpine tar czf /backup/sbt-$(date +%F).tar.gz -C /data .
find "$DEST" -name 'sbt-*.tar.gz' -mtime +14 -delete
```

### Restore
```bash
docker compose stop
docker run --rm -v sbt-data:/data -v $PWD:/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/sbt-2026-04-29.tar.gz -C /data"
docker compose up -d
```

### Move to another server
1. On source: stop, snapshot the volume to a tarball.
2. `scp` the tarball + project to the new server.
3. On destination: build fresh container (creates empty volume), stop, restore the tarball into the volume, start.

Detailed commands are in [README.md](README.md#move-from-test-server--production-server).

---

## 14. Publishing to GitHub

The `.gitignore` shipped with this project already excludes the dangerous things, but **double-check before pushing publicly**.

### Pre-flight checklist

```bash
# 1. Confirm no secrets are tracked
git status --ignored          # .env, data/, *.db should appear under "Ignored files"
git ls-files | grep -E '\.env$|\.db$|/data/'   # should print nothing

# 2. Strip the placeholder values from .env.example
cat .env.example
# Make sure SESSION_SECRET, APP_PASSWORD here are obviously dummy values.

# 3. Replace any business-specific defaults if you've made them
grep -rn "Halifax Photography Studio" prisma/seed.ts
# rename to your own demo or "Acme Studio"

# 4. Add a LICENSE file (this repo ships MIT — see LICENSE)
ls LICENSE
```

### Files that should NEVER be in git
- `.env` — your real secrets
- `data/` — the SQLite database and all uploaded receipts
- `node_modules/` — bloated, rebuilt from `package.json`
- `.next/` — build output
- `*.db` — any SQLite files
- `.DS_Store` — macOS junk

All of these are in `.gitignore`. Verify with `git status --ignored` before pushing.

### Init the repo & push
```bash
cd ~/Small\ Business\ Tracker        # or wherever you cloned it
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com (no README, no .gitignore — you have those)
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Recommended GitHub repo settings
- **Description**: "Self-hosted finance tracker for small businesses. Next.js + Prisma + SQLite, runs as a single Docker container."
- **Topics**: `nextjs`, `typescript`, `prisma`, `sqlite`, `docker`, `self-hosted`, `small-business`, `finance-tracker`
- **License**: MIT (already in the repo)
- **Issues**: enable, so users can report bugs
- **Discussions**: optional — useful if the project grows

### Things to update for your fork
- `package.json` → `name` and `version`
- `README.md` → swap the screenshot/branding section for your own
- `LICENSE` → add your name and the year
- `prisma/seed.ts` → replace the demo studio data with your own placeholders, or delete it entirely

---

## 15. FAQ

### Where is my data stored?
- Database: SQLite file at `./data/app.db` (inside the container at `/app/data/app.db`).
- Uploads: `./data/uploads/<year-month>/<random>.<ext>`.
- Both live in the Docker named volume `sbt-data`.

### How do I reset everything (start over)?
```bash
docker compose down -v        # WARNING: deletes the volume = all data + receipts
docker compose up -d --build
```

### How do I get into the database to look around?
```bash
docker compose exec app sh
apk add sqlite                # one-time, container-local
sqlite3 /app/data/app.db
.tables
SELECT * FROM Income LIMIT 5;
.quit
```

### How do I change the port?
In `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"   # host:container — change the LEFT side
```
Then `docker compose up -d --force-recreate`.

### How do I update after pulling code changes from GitHub?
```bash
git pull
docker compose up -d --build
```
The schema is auto-synced on container start (`prisma db push`). Existing data is preserved as long as columns are only added, not removed.

### I forgot my password.
SSH to the server, then:
```bash
docker compose exec app sh
node -e "require('bcryptjs').hash('newpassword',12).then(h => console.log(h))"
# copy the printed hash, then:
apk add sqlite
sqlite3 /app/data/app.db "UPDATE AuthCredential SET passwordHash='PASTE_HASH_HERE';"
```
Restart the container.

### Can I use Postgres instead of SQLite?
Yes. Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
Set `DATABASE_URL` to your Postgres connection string. Add a Postgres service to `docker-compose.yml`. The rest of the app needs no changes — Prisma's API is the same.

### The favicon / theme color isn't updating.
Browsers cache aggressively. Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`) or open the site in a private window.

### Where do I file bugs?
Use the **Issues** tab on the GitHub repo you forked from (or your own fork).

---

Built with [Next.js](https://nextjs.org), [Prisma](https://prisma.io), and [Tailwind CSS](https://tailwindcss.com).
