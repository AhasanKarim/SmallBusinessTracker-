import JSZip from "jszip";
import path from "path";
import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "./prisma";
import { uploadRoot, deleteUpload } from "./uploads";
import { EXPORT_VERSION } from "./data-export";

export type ImportMode = "merge" | "replace";

export type ImportResult = {
  ok: boolean;
  counts: {
    creditCards: number;
    events: number;
    incomes: number;
    expenses: number;
    documents: number;
  };
  warnings: string[];
};

/**
 * Restore an archive produced by buildExportArchive (or hand-crafted to the
 * same format — see IMPORT_FORMAT.md). All inserted rows get fresh CUIDs;
 * relations are remapped via in-memory id lookups.
 *
 * mode = "merge"   → append; existing data preserved.
 * mode = "replace" → wipe events/income/expenses/cards/documents (and old
 *                    file blobs) first, then import. Auth credentials are
 *                    NEVER touched in either mode.
 */
export async function importArchive(buffer: Buffer, mode: ImportMode): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(buffer);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("manifest.json missing — not a valid backup archive");
  const manifest = JSON.parse(await manifestFile.async("string"));
  if (typeof manifest.version !== "number") {
    throw new Error("manifest.json: 'version' is required and must be a number");
  }
  if (manifest.version > EXPORT_VERSION) {
    throw new Error(
      `Archive was produced by a newer version of the app (v${manifest.version}); ` +
        `this server understands up to v${EXPORT_VERSION}. Upgrade the app first.`,
    );
  }

  const dataFile = zip.file("data.json");
  if (!dataFile) throw new Error("data.json missing in archive");
  const data = JSON.parse(await dataFile.async("string"));

  const warnings: string[] = [];

  if (mode === "replace") {
    // Delete files on disk first so we don't orphan them.
    const oldDocs = await prisma.document.findMany();
    for (const d of oldDocs) await deleteUpload(d.storageKey).catch(() => {});

    const oldSettings = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
    if (oldSettings?.logoStorageKey) await deleteUpload(oldSettings.logoStorageKey).catch(() => {});

    // SetNull relations mean order matters less, but be explicit.
    await prisma.document.deleteMany();
    await prisma.income.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.event.deleteMany();
    await prisma.creditCard.deleteMany();
    // Keep AuthCredential. Settings get overwritten next.
  }

  // Settings — only restored in "replace" mode (merge would clobber the
  // operator's own business name/currency unexpectedly).
  if (mode === "replace" && data.settings) {
    let newLogoKey: string | null = null;
    let newLogoMime: string | null = null;
    if (data.settings.logoStorageKey) {
      const inZip = zip.file(`uploads/${data.settings.logoStorageKey}`);
      if (inZip) {
        const buf = Buffer.from(await inZip.async("nodebuffer"));
        newLogoKey = await writeFileToUploads(data.settings.logoStorageKey, buf);
        newLogoMime = data.settings.logoMimeType ?? "image/png";
      } else {
        warnings.push("Logo referenced in settings but missing in archive — skipped");
      }
    }
    const settingsData = {
      businessName: data.settings.businessName ?? "My Business",
      country: data.settings.country ?? "Canada",
      province: data.settings.province ?? "Nova Scotia",
      currency: data.settings.currency ?? "CAD",
      taxRegistered: !!data.settings.taxRegistered,
      taxType: data.settings.taxType ?? "HST",
      defaultTaxRate: data.settings.defaultTaxRate ?? null,
      logoStorageKey: newLogoKey,
      logoMimeType: newLogoMime,
    };
    await prisma.businessSettings.upsert({
      where: { id: "singleton" },
      update: settingsData,
      create: { id: "singleton", ...settingsData },
    });
  }

  // ID remapping tables — old archive id → new DB id.
  const cardIdMap: Record<string, string> = {};
  const eventIdMap: Record<string, string> = {};
  const incomeIdMap: Record<string, string> = {};
  const expenseIdMap: Record<string, string> = {};

  for (const c of asArray(data.creditCards)) {
    if (!c?.name) {
      warnings.push("Skipped credit card with no name");
      continue;
    }
    const created = await prisma.creditCard.create({
      data: {
        name: String(c.name),
        last4: optStr(c.last4),
        active: c.active ?? true,
        notes: optStr(c.notes),
        ...(c.createdAt ? { createdAt: new Date(c.createdAt) } : {}),
      },
    });
    if (c.id) cardIdMap[c.id] = created.id;
  }

  for (const e of asArray(data.events)) {
    if (!e?.name) {
      warnings.push("Skipped event with no name");
      continue;
    }
    const created = await prisma.event.create({
      data: {
        name: String(e.name),
        clientName: optStr(e.clientName),
        eventDate: optDate(e.eventDate),
        endDate: optDate(e.endDate),
        location: optStr(e.location),
        notes: optStr(e.notes),
        invoiceTotal: num(e.invoiceTotal, 0),
        amountPaid: num(e.amountPaid, 0),
        paymentStatus: String(e.paymentStatus ?? "UNPAID"),
        ...(e.createdAt ? { createdAt: new Date(e.createdAt) } : {}),
      },
    });
    if (e.id) eventIdMap[e.id] = created.id;
  }

  for (const i of asArray(data.incomes)) {
    if (i?.total == null) {
      warnings.push("Skipped income row with no total");
      continue;
    }
    const created = await prisma.income.create({
      data: {
        date: i.date ? new Date(i.date) : new Date(),
        clientName: optStr(i.clientName),
        subtotal: optNum(i.subtotal),
        taxAmount: optNum(i.taxAmount),
        total: num(i.total, 0),
        taxIncluded: !!i.taxIncluded,
        paymentMethod: String(i.paymentMethod ?? "OTHER"),
        transactionId: optStr(i.transactionId),
        etransferEmail: optStr(i.etransferEmail),
        invoiceNumber: optStr(i.invoiceNumber),
        invoiceSent: !!i.invoiceSent,
        notes: optStr(i.notes),
        eventId: i.eventId ? eventIdMap[i.eventId] ?? null : null,
        creditCardId: i.creditCardId ? cardIdMap[i.creditCardId] ?? null : null,
        ...(i.createdAt ? { createdAt: new Date(i.createdAt) } : {}),
      },
    });
    if (i.id) incomeIdMap[i.id] = created.id;
  }

  for (const e of asArray(data.expenses)) {
    if (e?.total == null) {
      warnings.push("Skipped expense row with no total");
      continue;
    }
    const created = await prisma.expense.create({
      data: {
        date: e.date ? new Date(e.date) : new Date(),
        vendor: optStr(e.vendor),
        category: String(e.category ?? "OTHER"),
        expenseType: e.expenseType === "GEAR" ? "GEAR" : "NON_GEAR",
        subtotal: optNum(e.subtotal),
        taxAmount: optNum(e.taxAmount),
        total: num(e.total, 0),
        taxIncluded: !!e.taxIncluded,
        paymentMethod: String(e.paymentMethod ?? "OTHER"),
        notes: optStr(e.notes),
        eventId: e.eventId ? eventIdMap[e.eventId] ?? null : null,
        creditCardId: e.creditCardId ? cardIdMap[e.creditCardId] ?? null : null,
        ...(e.createdAt ? { createdAt: new Date(e.createdAt) } : {}),
      },
    });
    if (e.id) expenseIdMap[e.id] = created.id;
  }

  let docsImported = 0;
  for (const d of asArray(data.documents)) {
    if (!d?.filename || !d?.storageKey) {
      warnings.push("Skipped document with missing filename or storageKey");
      continue;
    }
    const inZip = zip.file(`uploads/${d.storageKey}`);
    if (!inZip) {
      warnings.push(`Document file missing in archive: ${d.filename} (${d.storageKey})`);
      continue;
    }
    const buf = Buffer.from(await inZip.async("nodebuffer"));
    const newKey = await writeFileToUploads(d.storageKey, buf);
    await prisma.document.create({
      data: {
        filename: String(d.filename),
        storageKey: newKey,
        mimeType: String(d.mimeType ?? "application/octet-stream"),
        sizeBytes: num(d.sizeBytes, buf.length),
        kind: String(d.kind ?? "OTHER"),
        notes: optStr(d.notes),
        eventId: d.eventId ? eventIdMap[d.eventId] ?? null : null,
        incomeId: d.incomeId ? incomeIdMap[d.incomeId] ?? null : null,
        expenseId: d.expenseId ? expenseIdMap[d.expenseId] ?? null : null,
        ...(d.createdAt ? { createdAt: new Date(d.createdAt) } : {}),
      },
    });
    docsImported++;
  }

  return {
    ok: true,
    counts: {
      creditCards: Object.keys(cardIdMap).length,
      events: Object.keys(eventIdMap).length,
      incomes: Object.keys(incomeIdMap).length,
      expenses: Object.keys(expenseIdMap).length,
      documents: docsImported,
    },
    warnings,
  };
}

async function writeFileToUploads(originalKey: string, buf: Buffer): Promise<string> {
  const ext = path.extname(originalKey);
  const ym = new Date().toISOString().slice(0, 7);
  const random = crypto.randomBytes(12).toString("hex");
  const newKey = `${ym}/${random}${ext}`;
  const absPath = path.join(uploadRoot(), newKey);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);
  return newKey;
}

// JSON shapes are intentionally loose — coercion happens per field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}
function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function optNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function optDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
