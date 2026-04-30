"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMoney, parseOptionalMoney, parseDate } from "@/lib/utils";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { setFlash } from "@/lib/flash";

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

async function saveAllFiles(formData: FormData, field: string) {
  const out = [];
  for (const entry of formData.getAll(field)) {
    if (entry instanceof File && entry.size > 0) out.push(await saveUpload(entry));
  }
  return out;
}

function inferExpenseType(category: string, override?: string | null): "GEAR" | "NON_GEAR" {
  if (override === "GEAR" || override === "NON_GEAR") return override;
  const c = EXPENSE_CATEGORIES.find((x) => x.value === category);
  return c?.type ?? "NON_GEAR";
}

export async function createExpense(formData: FormData) {
  const total = parseMoney(formData.get("total"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "OTHER");
  const category = String(formData.get("category") ?? "OTHER");
  const eventId = optStr(formData.get("eventId"));
  const creditCardId = paymentMethod === "CREDIT_CARD" ? optStr(formData.get("creditCardId")) : null;
  const expenseType = inferExpenseType(category, optStr(formData.get("expenseType")));

  const expense = await prisma.expense.create({
    data: {
      date: parseDate(formData.get("date")),
      vendor: optStr(formData.get("vendor")),
      category,
      expenseType,
      subtotal: parseOptionalMoney(formData.get("subtotal")),
      taxAmount: parseOptionalMoney(formData.get("taxAmount")),
      total,
      taxIncluded: formData.get("taxIncluded") === "on",
      paymentMethod,
      notes: optStr(formData.get("notes")),
      eventId,
      creditCardId,
    },
  });

  const uploads = await saveAllFiles(formData, "receiptFile");
  if (uploads.length) {
    await prisma.document.createMany({
      data: uploads.map((u) => ({
        ...u,
        kind: "RECEIPT",
        expenseId: expense.id,
        eventId: eventId || undefined,
      })),
    });
  }

  setFlash(`Expense added${uploads.length ? ` (${uploads.length} receipt${uploads.length > 1 ? "s" : ""})` : ""}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function updateExpense(id: string, formData: FormData) {
  const total = parseMoney(formData.get("total"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "OTHER");
  const category = String(formData.get("category") ?? "OTHER");
  const eventId = optStr(formData.get("eventId"));
  const creditCardId = paymentMethod === "CREDIT_CARD" ? optStr(formData.get("creditCardId")) : null;
  const expenseType = inferExpenseType(category, optStr(formData.get("expenseType")));

  await prisma.expense.update({
    where: { id },
    data: {
      date: parseDate(formData.get("date")),
      vendor: optStr(formData.get("vendor")),
      category,
      expenseType,
      subtotal: parseOptionalMoney(formData.get("subtotal")),
      taxAmount: parseOptionalMoney(formData.get("taxAmount")),
      total,
      taxIncluded: formData.get("taxIncluded") === "on",
      paymentMethod,
      notes: optStr(formData.get("notes")),
      eventId,
      creditCardId,
    },
  });

  const uploads = await saveAllFiles(formData, "receiptFile");
  if (uploads.length) {
    await prisma.document.createMany({
      data: uploads.map((u) => ({
        ...u,
        kind: "RECEIPT",
        expenseId: id,
        eventId: eventId || undefined,
      })),
    });
  }

  setFlash(`Expense saved${uploads.length ? ` (+${uploads.length} receipt${uploads.length > 1 ? "s" : ""})` : ""}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function deleteExpense(id: string) {
  const exp = await prisma.expense.findUnique({ where: { id }, include: { documents: true } });
  if (!exp) return;
  for (const d of exp.documents) await deleteUpload(d.storageKey).catch(() => {});
  await prisma.expense.delete({ where: { id } });
  setFlash("Expense deleted");
  revalidatePath("/expenses");
  revalidatePath("/");
  if (exp.eventId) revalidatePath(`/events/${exp.eventId}`);
}

export async function deleteExpenseDocument(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;
  await deleteUpload(doc.storageKey).catch(() => {});
  await prisma.document.delete({ where: { id: documentId } });
  setFlash("Receipt removed");
  if (doc.expenseId) revalidatePath(`/expenses/${doc.expenseId}`);
}
