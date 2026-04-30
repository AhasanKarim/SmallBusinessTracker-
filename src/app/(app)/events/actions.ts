"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMoney, parseOptionalDate } from "@/lib/utils";
import { derivePaymentStatus } from "@/lib/constants";
import { setFlash } from "@/lib/flash";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Event name is required");
  const invoiceTotal = parseMoney(formData.get("invoiceTotal"));
  const amountPaid = parseMoney(formData.get("amountPaid"));
  const event = await prisma.event.create({
    data: {
      name,
      clientName: optStr(formData.get("clientName")),
      eventDate: parseOptionalDate(formData.get("eventDate")),
      endDate: parseOptionalDate(formData.get("endDate")),
      location: optStr(formData.get("location")),
      notes: optStr(formData.get("notes")),
      invoiceTotal,
      amountPaid,
      paymentStatus: derivePaymentStatus(invoiceTotal, amountPaid),
    },
  });
  setFlash("Event created");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const invoiceTotal = parseMoney(formData.get("invoiceTotal"));
  const amountPaid = parseMoney(formData.get("amountPaid"));
  await prisma.event.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim() || "Untitled",
      clientName: optStr(formData.get("clientName")),
      eventDate: parseOptionalDate(formData.get("eventDate")),
      endDate: parseOptionalDate(formData.get("endDate")),
      location: optStr(formData.get("location")),
      notes: optStr(formData.get("notes")),
      invoiceTotal,
      amountPaid,
      paymentStatus: derivePaymentStatus(invoiceTotal, amountPaid),
    },
  });
  setFlash("Event saved");
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  setFlash("Event deleted");
  revalidatePath("/events");
  redirect("/events");
}

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
