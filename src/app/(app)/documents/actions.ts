"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { setFlash } from "@/lib/flash";

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function uploadDocument(formData: FormData) {
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    setFlash("No file selected", "error");
    return;
  }
  for (const file of files) {
    const meta = await saveUpload(file);
    await prisma.document.create({
      data: {
        ...meta,
        kind: String(formData.get("kind") ?? "OTHER"),
        notes: optStr(formData.get("notes")),
        eventId: optStr(formData.get("eventId")),
        incomeId: optStr(formData.get("incomeId")),
        expenseId: optStr(formData.get("expenseId")),
      },
    });
  }
  setFlash(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  revalidatePath("/documents");
}

export async function deleteDocument(id: string) {
  const d = await prisma.document.findUnique({ where: { id } });
  if (!d) return;
  await deleteUpload(d.storageKey).catch(() => {});
  await prisma.document.delete({ where: { id } });
  setFlash("Document deleted");
  revalidatePath("/documents");
}
