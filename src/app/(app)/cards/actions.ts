"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { setFlash } from "@/lib/flash";

function optStr(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function createCard(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    setFlash("Card name is required", "error");
    return;
  }
  await prisma.creditCard.create({
    data: {
      name,
      last4: optStr(formData.get("last4")),
      active: formData.get("active") !== "off",
      notes: optStr(formData.get("notes")),
    },
  });
  setFlash("Card added");
  revalidatePath("/cards");
}

export async function updateCard(id: string, formData: FormData) {
  await prisma.creditCard.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim() || "Card",
      last4: optStr(formData.get("last4")),
      active: formData.get("active") === "on",
      notes: optStr(formData.get("notes")),
    },
  });
  setFlash("Card saved");
  revalidatePath("/cards");
}

export async function deleteCard(id: string) {
  await prisma.creditCard.delete({ where: { id } });
  setFlash("Card deleted");
  revalidatePath("/cards");
}

export async function toggleCard(id: string) {
  const c = await prisma.creditCard.findUnique({ where: { id } });
  if (!c) return;
  await prisma.creditCard.update({ where: { id }, data: { active: !c.active } });
  setFlash(c.active ? "Card deactivated" : "Card activated");
  revalidatePath("/cards");
}
