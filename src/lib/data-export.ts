import JSZip from "jszip";
import { prisma } from "./prisma";
import { readUpload } from "./uploads";

/**
 * Bumped on breaking changes to the archive layout. Importers should refuse
 * versions newer than they understand.
 */
export const EXPORT_VERSION = 1;

/**
 * Build a portable ZIP backup of the entire tracker.
 *
 *   /manifest.json   — version, exportedAt, record counts
 *   /data.json       — every row from every table (excluding auth credentials)
 *   /uploads/<key>   — the raw file blob for every Document and the logo
 *
 * Auth credentials (the password hash) are intentionally excluded — backups are
 * portable across servers, and each server should keep its own login secret.
 */
export async function buildExportArchive(): Promise<Buffer> {
  const [settings, creditCards, events, incomes, expenses, documents] = await Promise.all([
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.income.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.expense.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.document.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const zip = new JSZip();

  const manifest = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: "Small Business Tracker",
    counts: {
      creditCards: creditCards.length,
      events: events.length,
      incomes: incomes.length,
      expenses: expenses.length,
      documents: documents.length,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  zip.file(
    "data.json",
    JSON.stringify(
      { settings, creditCards, events, incomes, expenses, documents },
      null,
      2,
    ),
  );

  // Bundle the actual file bytes referenced by Documents + the logo.
  const filesToInclude = new Set<string>();
  if (settings?.logoStorageKey) filesToInclude.add(settings.logoStorageKey);
  for (const doc of documents) filesToInclude.add(doc.storageKey);

  for (const key of filesToInclude) {
    try {
      const { buffer } = await readUpload(key);
      zip.file(`uploads/${key}`, buffer);
    } catch {
      // file missing on disk — skip; the DB record still ships in data.json
    }
  }

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
