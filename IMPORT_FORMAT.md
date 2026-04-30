# Backup / Import File Format

This document describes the portable archive format used by Small Business Tracker for **export** and **import**. It is stable for archive `version: 1`.

The format is intentionally simple — a ZIP file containing JSON plus the original uploaded files — so anyone can prepare an archive from another tool (QuickBooks, Wave, a spreadsheet, a different self-hosted tracker, etc.) and import it.

---

## Contents

1. [Where to find this in the app](#where-to-find-this-in-the-app)
2. [Archive layout](#archive-layout)
3. [`manifest.json`](#manifestjson)
4. [`data.json` schema](#datajson-schema)
5. [The `uploads/` folder](#the-uploads-folder)
6. [Import behavior](#import-behavior)
7. [Validation rules](#validation-rules)
8. [Minimum viable archive](#minimum-viable-archive)
9. [Migrating from other tools](#migrating-from-other-tools)
10. [Building an archive in code](#building-an-archive-in-code)

---

## Where to find this in the app

**Settings → Data**:
- **Download backup (.zip)** generates a fresh archive in this format.
- **Restore from backup** accepts an archive in this format.

The same endpoints are also reachable as plain HTTP:
- `GET /api/data/export` → returns a ZIP download
- `POST /api/data/import` (multipart/form-data; fields `backup` = file, `mode` = `merge` | `replace`)

Both endpoints sit behind the standard auth — a valid session cookie is required.

---

## Archive layout

The archive is a standard ZIP file:

```
sbt-backup-2026-04-30.zip
├── manifest.json
├── data.json
└── uploads/
    ├── 2026-04/
    │   ├── 9f3a8e2c1b4d.jpg     ← receipt photo
    │   └── 7d2b1c5e9a8f.pdf     ← invoice PDF
    └── 2026-03/
        └── 4e1a2b3c5d6e.png     ← business logo
```

- All paths in the ZIP use forward slashes.
- File names under `uploads/` match exactly the `storageKey` field of the corresponding `Document` (or `BusinessSettings.logoStorageKey`).
- The folder structure `YYYY-MM/<random>.<ext>` is the convention this app uses, but the importer treats `storageKey` as opaque — any relative path works as long as `data.json` and the actual file path agree.

---

## `manifest.json`

```json
{
  "version": 1,
  "exportedAt": "2026-04-30T14:32:11.421Z",
  "source": "Small Business Tracker",
  "counts": {
    "creditCards": 3,
    "events": 12,
    "incomes": 47,
    "expenses": 153,
    "documents": 121
  }
}
```

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `version` | **yes** | number | Format version. Importer rejects archives with `version` newer than it understands. |
| `exportedAt` | recommended | ISO 8601 string | When the archive was created. Informational. |
| `source` | recommended | string | Tool that produced the archive. Informational. |
| `counts` | optional | object | Row counts. Informational — importer doesn't enforce them. |

A minimal valid manifest is just `{ "version": 1 }`.

---

## `data.json` schema

Top-level keys are arrays (or one object for `settings`):

```json
{
  "settings":     { ... single object or null ... },
  "creditCards":  [ ... ],
  "events":       [ ... ],
  "incomes":      [ ... ],
  "expenses":     [ ... ],
  "documents":    [ ... ]
}
```

Any top-level key is optional. Missing keys are treated as empty arrays / no settings.

Each object below shows **all** fields. Bold = required. Optional fields can be omitted, set to `null`, or empty string — the importer normalizes them.

### `settings` (object or null)

Restored only in `replace` mode (see [Import behavior](#import-behavior)).

```json
{
  "businessName":   "Halifax Photography Studio",
  "country":        "Canada",
  "province":       "Nova Scotia",
  "currency":       "CAD",
  "taxRegistered":  false,
  "taxType":        "HST",
  "defaultTaxRate": 0.15,
  "logoStorageKey": "2026-03/4e1a2b3c5d6e.png",
  "logoMimeType":   "image/png"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `businessName` | string | Defaults to `"My Business"`. |
| `country` | string | Defaults to `"Canada"`. |
| `province` | string | Defaults to `"Nova Scotia"`. |
| `currency` | 3-letter code | Defaults to `"CAD"`. |
| `taxRegistered` | boolean | Defaults to `false`. |
| `taxType` | string | One of `HST`, `GST`, `PST`, `GST_PST`, `CUSTOM`. |
| `defaultTaxRate` | number or null | E.g. `0.15` for 15%. |
| `logoStorageKey` | string or null | Must point to a file inside `uploads/` in the archive, otherwise the logo is dropped (warning emitted). |
| `logoMimeType` | string or null | E.g. `"image/png"`. |

### `creditCards[]`

```json
{
  "id":    "old-cuid-or-anything-unique",
  "name":  "Amex Cobalt",
  "last4": "1001",
  "active": true,
  "notes": "Daily spend, 5x dining/groceries",
  "createdAt": "2026-01-12T18:00:00.000Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| **`id`** | string | yes (for relations) | Used only for cross-table id mapping during import. New CUIDs are generated for the DB. Any unique string works. |
| **`name`** | string | yes | Cards without a name are skipped with a warning. |
| `last4` | string or null | no | Last 4 digits, no spaces. |
| `active` | boolean | no | Defaults to `true`. |
| `notes` | string or null | no | |
| `createdAt` | ISO 8601 | no | If omitted, defaults to import time. |

### `events[]`

```json
{
  "id":            "evt-001",
  "name":          "Smith Wedding",
  "clientName":    "Alex & Jamie Smith",
  "eventDate":     "2026-06-12T00:00:00.000Z",
  "endDate":       "2026-06-13T00:00:00.000Z",
  "location":      "Peggy's Cove, NS",
  "notes":         "Full-day coverage + engagement session",
  "invoiceTotal":  4500,
  "amountPaid":    1500,
  "paymentStatus": "PARTIAL",
  "createdAt":     "2026-04-01T12:00:00.000Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| **`id`** | string | yes (for relations) | See note on `creditCards[].id`. |
| **`name`** | string | yes | Events without a name are skipped. |
| `clientName` | string or null | no | |
| `eventDate` | ISO 8601 or null | no | Start date for multi-day events; the only date for single-day. |
| `endDate` | ISO 8601 or null | no | Omit for single-day events. |
| `location` | string or null | no | |
| `notes` | string or null | no | |
| `invoiceTotal` | number | no | Defaults to `0`. |
| `amountPaid` | number | no | Defaults to `0`. The importer trusts this value as-is — it does NOT recompute from linked income rows. |
| `paymentStatus` | `UNPAID` \| `PARTIAL` \| `PAID` | no | Defaults to `"UNPAID"`. |
| `createdAt` | ISO 8601 | no | |

### `incomes[]`

```json
{
  "id":             "inc-001",
  "date":           "2026-04-15T00:00:00.000Z",
  "clientName":     "Alex Smith",
  "subtotal":       1304.35,
  "taxAmount":      195.65,
  "total":          1500.00,
  "taxIncluded":    false,
  "paymentMethod":  "ETRANSFER",
  "transactionId":  "CA12345678901",
  "etransferEmail": "studio@example.com",
  "invoiceNumber":  "INV-2026-001",
  "invoiceSent":    true,
  "notes":          "Deposit",
  "eventId":        "evt-001",
  "creditCardId":   null,
  "createdAt":      "2026-04-15T18:23:00.000Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | recommended | Used as a key for `Document.incomeId`. |
| `date` | ISO 8601 | no | Defaults to import time. |
| `clientName` | string or null | no | |
| `subtotal` | number or null | no | |
| `taxAmount` | number or null | no | |
| **`total`** | number | yes | Rows missing `total` are skipped with a warning. |
| `taxIncluded` | boolean | no | |
| **`paymentMethod`** | string | recommended | One of `CASH`, `DEBIT`, `CREDIT_CARD`, `ETRANSFER`, `CHEQUE`, `OTHER`. Unknown values stored as-is. Defaults to `"OTHER"`. |
| `transactionId` | string or null | no | Only meaningful when `paymentMethod === "ETRANSFER"`. |
| `etransferEmail` | string or null | no | Only meaningful when `paymentMethod === "ETRANSFER"`. |
| `invoiceNumber` | string or null | no | |
| `invoiceSent` | boolean | no | |
| `notes` | string or null | no | |
| `eventId` | string or null | no | Must match an `events[].id` in the same archive, or it's set to `null` in the imported row. |
| `creditCardId` | string or null | no | Must match a `creditCards[].id` in the same archive, or set to `null`. |
| `createdAt` | ISO 8601 | no | |

### `expenses[]`

```json
{
  "id":            "exp-001",
  "date":          "2026-04-10T00:00:00.000Z",
  "vendor":        "Henry's Camera",
  "category":      "GEAR",
  "expenseType":   "GEAR",
  "subtotal":      1652.16,
  "taxAmount":     247.83,
  "total":         1899.99,
  "taxIncluded":   false,
  "paymentMethod": "CREDIT_CARD",
  "notes":         "Sigma 35mm f/1.4 Art",
  "eventId":       null,
  "creditCardId":  "card-001",
  "createdAt":     "2026-04-10T14:00:00.000Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | recommended | Used as a key for `Document.expenseId`. |
| `date` | ISO 8601 | no | Defaults to import time. |
| `vendor` | string or null | no | |
| **`category`** | string | recommended | One of: `GEAR`, `COFFEE_TEAM_FOOD`, `MEALS`, `GAS`, `RIDE`, `PARKING`, `SOFTWARE`, `STUDIO_RENT`, `PROPS`, `PRINTING`, `MARKETING`, `OTHER`. Unknown categories are stored as-is and shown verbatim in the UI. |
| **`expenseType`** | `GEAR` or `NON_GEAR` | recommended | If anything other than `"GEAR"`, treated as `"NON_GEAR"`. |
| `subtotal` | number or null | no | |
| `taxAmount` | number or null | no | |
| **`total`** | number | yes | Rows missing `total` are skipped with a warning. |
| `taxIncluded` | boolean | no | |
| **`paymentMethod`** | string | recommended | Same set as for income. |
| `notes` | string or null | no | |
| `eventId` | string or null | no | Same remapping as income. |
| `creditCardId` | string or null | no | Same remapping as income. |
| `createdAt` | ISO 8601 | no | |

### `documents[]`

```json
{
  "id":         "doc-001",
  "filename":   "henrys-receipt.jpg",
  "storageKey": "2026-04/9f3a8e2c1b4d.jpg",
  "mimeType":   "image/jpeg",
  "sizeBytes":  238412,
  "kind":       "RECEIPT",
  "notes":      "Sigma 35mm purchase",
  "eventId":    null,
  "incomeId":   null,
  "expenseId":  "exp-001",
  "createdAt":  "2026-04-10T14:01:00.000Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| **`filename`** | string | yes | Original filename, shown in the UI. |
| **`storageKey`** | string | yes | Relative path inside `uploads/` in the ZIP. The importer reads `uploads/<storageKey>` to get the file bytes. If the file is missing in the archive, the document row is skipped with a warning. |
| **`mimeType`** | string | recommended | E.g. `"image/jpeg"`, `"application/pdf"`. Defaults to `"application/octet-stream"`. |
| `sizeBytes` | number | no | If omitted, falls back to actual byte length of the file in the archive. |
| **`kind`** | string | recommended | One of `RECEIPT`, `INVOICE`, `CONTRACT`, `OTHER`. Unknown values stored as-is. |
| `notes` | string or null | no | |
| `eventId` | string or null | no | Remapped via `events[].id`. |
| `incomeId` | string or null | no | Remapped via `incomes[].id`. |
| `expenseId` | string or null | no | Remapped via `expenses[].id`. |
| `createdAt` | ISO 8601 | no | |

---

## The `uploads/` folder

Every file referenced by `Document.storageKey` (and the `BusinessSettings.logoStorageKey`) **must** be present in the ZIP under `uploads/<storageKey>`.

Rules:
- Path inside the ZIP: `uploads/` + the exact `storageKey` string.
- Forward-slash separators only.
- The path is opaque to the importer — it doesn't have to follow the `YYYY-MM/<random>.<ext>` convention. `uploads/anything/i/want.pdf` is fine.
- During import, every file is **rewritten** to a freshly-generated key (`<current YYYY-MM>/<16-hex>.<ext>`). The original key is only used to find the bytes inside the ZIP.
- Missing files don't fail the import — the affected document rows are skipped, and warnings are returned.

There is no size limit imposed by the importer beyond the host's available memory and disk. (The ZIP is loaded into memory in this implementation; very large archives could OOM on small servers.)

---

## Import behavior

### Modes

| Mode | What gets wiped before import | What gets imported |
| --- | --- | --- |
| `merge` | Nothing | All record arrays in `data.json`. **Settings are NOT touched.** |
| `replace` | All credit cards, events, income, expenses, documents (and their files on disk). Old logo file. | All record arrays AND `settings` (including the logo). |

In **both modes**:
- The `AuthCredential` (login password) is **never** modified by import. The session-secret-signed cookies remain valid.
- The `BusinessSettings` row id is always `"singleton"` — it's created if missing.

### ID remapping

IDs in the archive are treated as opaque tokens. The importer:
1. Generates a new CUID for each inserted row.
2. Builds an in-memory map `{ archive-id → new-id }` per table.
3. When inserting child rows (e.g. `incomes`), looks up `eventId` / `creditCardId` / etc. in the parent maps and substitutes the new id. If the lookup fails, the foreign key is set to `null` and the row still imports.

This means archive IDs can be anything that's unique within their table — `"old-cuid"`, `"42"`, `"acme-card-1"`, whatever. They never appear in the database.

### Order of operations

The importer processes record arrays in this order so foreign keys can be resolved:
1. `creditCards`
2. `events`
3. `incomes`
4. `expenses`
5. `documents`

Within each array, records are inserted in the order they appear.

### What happens on partial failure

The import is **not** transactional. If the process dies halfway:
- Rows already inserted stay in the database.
- Files already written to `uploads/` stay on disk.
- The next import attempt with the same archive in `merge` mode would create duplicates.

For a failed-but-partial import, the simplest recovery is to run the import again in `replace` mode (which wipes first).

### Warnings

The HTTP response from `POST /api/data/import` contains a flash toast summarising counts and warning count. The full warning list is logged to the server console. Warnings include:
- `"manifest.json missing — not a valid backup archive"` (fatal)
- `"Archive was produced by a newer version of the app (vN); this server understands up to vN"` (fatal)
- `"Skipped credit card with no name"`
- `"Skipped event with no name"`
- `"Skipped income/expense row with no total"`
- `"Document file missing in archive: <filename> (<storageKey>)"` — DB row skipped
- `"Logo referenced in settings but missing in archive — skipped"`

---

## Validation rules

The importer is **lenient** by design — anything reasonable will be coerced rather than rejected. Specifically:

- Missing `null` / empty string for an optional field → stored as `null`.
- Numbers as strings (`"1500"`) → parsed via `Number()`.
- Dates as strings → parsed via `new Date()`. Invalid dates fall back to import time (or `null` for fields where `null` is allowed).
- Boolean coercion uses JS truthy/falsy with a `!!` cast.
- Unknown enum values for `paymentMethod`, `category`, `kind` are stored as-is. The UI will show the raw token.

Hard requirements (rows are skipped if missing):
- `creditCards[].name`
- `events[].name`
- `incomes[].total`
- `expenses[].total`
- `documents[].filename` and `documents[].storageKey`

Hard requirements at the archive level (whole import fails):
- `manifest.json` exists and contains `version: number`
- `manifest.version <= 1` (current importer)
- `data.json` exists and is valid JSON

---

## Minimum viable archive

Smallest possible legal archive — adds one income row and nothing else:

**`manifest.json`**
```json
{ "version": 1 }
```

**`data.json`**
```json
{
  "incomes": [
    { "date": "2026-04-30", "total": 100, "paymentMethod": "CASH" }
  ]
}
```

ZIP it (`zip mini.zip manifest.json data.json`) and import. You'll get one income row dated 2026-04-30 for $100 cash. No event link, no client, no documents.

---

## Migrating from other tools

The format is intentionally close to a CSV column set, so converting from a spreadsheet or another tool is mostly a matter of writing a small script. A few starting points:

### From a CSV of income rows

```python
import csv, json, zipfile

incomes = []
with open("income.csv") as f:
    for row in csv.DictReader(f):
        incomes.append({
            "date":          row["Date"],            # YYYY-MM-DD
            "clientName":    row["Client"] or None,
            "total":         float(row["Amount"]),
            "paymentMethod": row["Method"].upper(),  # "ETRANSFER" / "CASH" / etc.
            "notes":         row.get("Notes") or None,
        })

with zipfile.ZipFile("import.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", json.dumps({"version": 1}))
    z.writestr("data.json", json.dumps({"incomes": incomes}))

print(f"Wrote {len(incomes)} income rows to import.zip")
```

Then **Settings → Data → Restore from backup → Merge → Restore**.

### From QuickBooks

QuickBooks exports XLSX. Open in any spreadsheet, save the relevant columns as CSV, then use the script above. For receipts, you'd need to add a `documents[]` array and stuff the file bytes into `uploads/<your-key>` inside the ZIP — see the next section.

### From Wave / FreshBooks / Xero

Same approach: export the relevant CSVs, map columns to the schemas in this document, write `data.json` + `manifest.json`, ZIP it.

### Mapping common column names

| Their column | Our field |
| --- | --- |
| Date / Transaction Date | `date` |
| Customer / Client | `clientName` (income), `clientName` on event |
| Vendor / Payee | `vendor` (expense) |
| Amount / Total | `total` |
| Subtotal / Net | `subtotal` |
| Tax / GST / HST | `taxAmount` |
| Payment Method / Type | `paymentMethod` (uppercase, see enum above) |
| Memo / Description | `notes` |
| Category / Account | `category` (expense — see enum) |
| Reference / Invoice # | `invoiceNumber` (income), `transactionId` (e-transfer) |

---

## Building an archive in code

### Node.js (matches what this app does internally)

```js
const JSZip = require("jszip");
const fs = require("fs");

async function build() {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({ version: 1, source: "my-converter" }));
  zip.file("data.json", JSON.stringify({
    creditCards: [],
    events: [{ id: "e1", name: "Test job", invoiceTotal: 500, amountPaid: 0 }],
    incomes: [{ id: "i1", eventId: "e1", date: "2026-04-30", total: 250, paymentMethod: "CASH" }],
    expenses: [],
    documents: [],
  }));
  // If you have document files, add them like:
  // zip.file("uploads/2026-04/abc.jpg", fs.readFileSync("./receipt.jpg"));
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync("out.zip", buf);
}
build();
```

### Python

```python
import json, zipfile

with zipfile.ZipFile("out.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", json.dumps({"version": 1}))
    z.writestr("data.json", json.dumps({
        "events":   [{"id": "e1", "name": "Test job", "invoiceTotal": 500}],
        "incomes":  [{"id": "i1", "eventId": "e1", "date": "2026-04-30",
                      "total": 250, "paymentMethod": "CASH"}],
    }))
    # with open("receipt.jpg", "rb") as f:
    #     z.writestr("uploads/2026-04/abc.jpg", f.read())
```

### Shell + `jq` (no record-relations, just JSON)

```bash
mkdir -p archive/uploads
echo '{"version":1}' > archive/manifest.json
jq -n '{
  incomes: [
    { date: "2026-04-30", total: 100, paymentMethod: "CASH" },
    { date: "2026-04-29", total: 250, paymentMethod: "ETRANSFER", etransferEmail: "biz@example.com" }
  ]
}' > archive/data.json
( cd archive && zip -r ../my-import.zip . )
```

---

## Versioning

This document describes archive `version: 1`. Future format changes will:
- Bump `version` to `2`, `3`, …
- Old archives (`version: 1`) will continue to import, with new fields filled by defaults.
- New archives (`version: 2`) will be **rejected** by older app versions, with a clear error message asking the operator to upgrade.

If you build an automated converter, check the running app's `manifest.json` from a fresh export to see what version it produces, and target that version (or older).

---

## See also

- [README.md](README.md) — overall app
- [CUSTOMIZATION.md](CUSTOMIZATION.md) — how to fork and modify
- `prisma/schema.prisma` — authoritative source of every field
