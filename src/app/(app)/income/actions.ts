"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMoney, parseOptionalMoney, parseDate } from "@/lib/utils";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { derivePaymentStatus } from "@/lib/constants";
import { setFlash } from "@/lib/flash";

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Save every File entry (>0 bytes) for the given form-field name.
 * Returns the count actually saved so the caller can attach them.
 */
async function saveAllFiles(formData: FormData, field: string) {
  const out = [];
  for (const entry of formData.getAll(field)) {
    if (entry instanceof File && entry.size > 0) {
      out.push(await saveUpload(entry));
    }
  }
  return out;
}

export async function createIncome(formData: FormData) {
  const total = parseMoney(formData.get("total"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "OTHER");
  const eventId = optStr(formData.get("eventId"));
  const creditCardId = paymentMethod === "CREDIT_CARD" ? optStr(formData.get("creditCardId")) : null;
  const isEtransfer = paymentMethod === "ETRANSFER";

  const income = await prisma.income.create({
    data: {
      date: parseDate(formData.get("date")),
      clientName: optStr(formData.get("clientName")),
      subtotal: parseOptionalMoney(formData.get("subtotal")),
      taxAmount: parseOptionalMoney(formData.get("taxAmount")),
      total,
      taxIncluded: formData.get("taxIncluded") === "on",
      paymentMethod,
      transactionId: isEtransfer ? optStr(formData.get("transactionId")) : null,
      etransferEmail: isEtransfer ? optStr(formData.get("etransferEmail")) : null,
      invoiceNumber: optStr(formData.get("invoiceNumber")),
      invoiceSent: formData.get("invoiceSent") === "on",
      notes: optStr(formData.get("notes")),
      eventId,
      creditCardId,
    },
  });

  const uploads = await saveAllFiles(formData, "invoiceFile");
  if (uploads.length) {
    await prisma.document.createMany({
      data: uploads.map((u) => ({
        ...u,
        kind: "INVOICE",
        incomeId: income.id,
        eventId: eventId || undefined,
      })),
    });
  }

  if (eventId) await syncEventPaid(eventId);
  setFlash(`Income added${uploads.length ? ` (${uploads.length} file${uploads.length > 1 ? "s" : ""})` : ""}`);
  revalidatePath("/income");
  revalidatePath("/");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function updateIncome(id: string, formData: FormData) {
  const total = parseMoney(formData.get("total"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "OTHER");
  const eventId = optStr(formData.get("eventId"));
  const creditCardId = paymentMethod === "CREDIT_CARD" ? optStr(formData.get("creditCardId")) : null;
  const isEtransfer = paymentMethod === "ETRANSFER";

  const before = await prisma.income.findUnique({ where: { id } });

  await prisma.income.update({
    where: { id },
    data: {
      date: parseDate(formData.get("date")),
      clientName: optStr(formData.get("clientName")),
      subtotal: parseOptionalMoney(formData.get("subtotal")),
      taxAmount: parseOptionalMoney(formData.get("taxAmount")),
      total,
      taxIncluded: formData.get("taxIncluded") === "on",
      paymentMethod,
      transactionId: isEtransfer ? optStr(formData.get("transactionId")) : null,
      etransferEmail: isEtransfer ? optStr(formData.get("etransferEmail")) : null,
      invoiceNumber: optStr(formData.get("invoiceNumber")),
      invoiceSent: formData.get("invoiceSent") === "on",
      notes: optStr(formData.get("notes")),
      eventId,
      creditCardId,
    },
  });

  const uploads = await saveAllFiles(formData, "invoiceFile");
  if (uploads.length) {
    await prisma.document.createMany({
      data: uploads.map((u) => ({
        ...u,
        kind: "INVOICE",
        incomeId: id,
        eventId: eventId || undefined,
      })),
    });
  }

  if (before?.eventId && before.eventId !== eventId) await syncEventPaid(before.eventId);
  if (eventId) await syncEventPaid(eventId);

  setFlash(`Income saved${uploads.length ? ` (+${uploads.length} file${uploads.length > 1 ? "s" : ""})` : ""}`);
  revalidatePath("/income");
  revalidatePath("/");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function deleteIncome(id: string) {
  const inc = await prisma.income.findUnique({ where: { id }, include: { documents: true } });
  if (!inc) return;
  for (const d of inc.documents) await deleteUpload(d.storageKey).catch(() => {});
  await prisma.income.delete({ where: { id } });
  if (inc.eventId) await syncEventPaid(inc.eventId);
  setFlash("Income deleted");
  revalidatePath("/income");
  revalidatePath("/");
  if (inc.eventId) revalidatePath(`/events/${inc.eventId}`);
}

export async function deleteIncomeDocument(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;
  await deleteUpload(doc.storageKey).catch(() => {});
  await prisma.document.delete({ where: { id: documentId } });
  setFlash("Attachment removed");
  if (doc.incomeId) revalidatePath(`/income/${doc.incomeId}`);
}

async function syncEventPaid(eventId: string) {
  const ev = await prisma.event.findUnique({ where: { id: eventId } });
  if (!ev) return;
  const agg = await prisma.income.aggregate({
    where: { eventId },
    _sum: { total: true },
  });
  const paid = agg._sum.total ?? 0;
  await prisma.event.update({
    where: { id: eventId },
    data: {
      amountPaid: paid,
      paymentStatus: derivePaymentStatus(ev.invoiceTotal, paid),
    },
  });
}
