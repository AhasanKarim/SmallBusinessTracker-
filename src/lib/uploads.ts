import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

export function uploadRoot(): string {
  return path.resolve(UPLOAD_DIR);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

export async function saveUpload(file: File): Promise<{
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}> {
  if (!file || typeof file === "string") {
    throw new Error("No file provided");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || mimeToExt(file.type) || "";
  const safeBase = crypto.randomBytes(12).toString("hex");
  const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const relPath = path.join(yearMonth, `${safeBase}${ext}`);
  const absPath = path.join(uploadRoot(), relPath);
  await ensureDir(path.dirname(absPath));
  await writeFile(absPath, buffer);
  return {
    storageKey: relPath,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buffer.length,
  };
}

export async function readUpload(storageKey: string): Promise<{ buffer: Buffer; size: number }> {
  const safe = sanitizeKey(storageKey);
  const abs = path.join(uploadRoot(), safe);
  const s = await stat(abs);
  const buffer = await readFile(abs);
  return { buffer, size: s.size };
}

export async function deleteUpload(storageKey: string): Promise<void> {
  const safe = sanitizeKey(storageKey);
  const abs = path.join(uploadRoot(), safe);
  try {
    await unlink(abs);
  } catch {
    // best-effort
  }
}

function sanitizeKey(key: string): string {
  // Prevent path traversal: only allow forward-slash separated relative keys.
  const normalized = path.posix.normalize(key.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

function mimeToExt(mime: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };
  return map[mime] ?? null;
}
