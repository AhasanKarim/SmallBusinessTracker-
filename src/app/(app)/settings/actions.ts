"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { setPassword } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { setFlash } from "@/lib/flash";

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function saveSettings(formData: FormData) {
  const taxRate = optStr(formData.get("defaultTaxRate"));
  const data = {
    businessName: String(formData.get("businessName") ?? "My Business").trim() || "My Business",
    country: String(formData.get("country") ?? "Canada").trim(),
    province: String(formData.get("province") ?? "Nova Scotia").trim(),
    currency: String(formData.get("currency") ?? "CAD").trim() || "CAD",
    taxRegistered: formData.get("taxRegistered") === "on",
    taxType: String(formData.get("taxType") ?? "HST"),
    defaultTaxRate: taxRate ? Number(taxRate) : null,
  };
  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  setFlash("Settings saved");
  revalidatePath("/", "layout");
}

export async function changePassword(formData: FormData) {
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!next || next.length < 8) {
    setFlash("Password must be at least 8 characters", "error");
    return;
  }
  if (next !== confirm) {
    setFlash("Passwords do not match", "error");
    return;
  }
  await setPassword(next);
  setFlash("Password updated");
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    setFlash("Pick a logo file first", "error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    setFlash("Logo must be an image (PNG, JPG, SVG, etc.)", "error");
    return;
  }
  const meta = await saveUpload(file);

  // Replace the previous logo file on disk to avoid orphans.
  const existing = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  if (existing?.logoStorageKey) {
    await deleteUpload(existing.logoStorageKey).catch(() => {});
  }

  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: { logoStorageKey: meta.storageKey, logoMimeType: meta.mimeType },
    create: {
      id: "singleton",
      logoStorageKey: meta.storageKey,
      logoMimeType: meta.mimeType,
    },
  });

  setFlash("Logo updated");
  revalidatePath("/", "layout");
}

export async function removeLogo() {
  const existing = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  if (existing?.logoStorageKey) {
    await deleteUpload(existing.logoStorageKey).catch(() => {});
    await prisma.businessSettings.update({
      where: { id: "singleton" },
      data: { logoStorageKey: null, logoMimeType: null },
    });
  }
  setFlash("Logo removed");
  revalidatePath("/", "layout");
}
