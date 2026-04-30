"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { formatDateInput } from "@/lib/utils";

type Card = { id: string; name: string; last4: string | null; active: boolean };
type EventLite = { id: string; name: string };
type ExpenseData = {
  id: string;
  date: Date | string;
  vendor: string | null;
  category: string;
  expenseType: string;
  subtotal: number | null;
  taxAmount: number | null;
  total: number;
  taxIncluded: boolean;
  paymentMethod: string;
  notes: string | null;
  eventId: string | null;
  creditCardId: string | null;
};

export function ExpenseForm({
  cards,
  events,
  taxEnabled,
  defaultEventId,
  initial,
  action,
  submitLabel = "Save",
}: {
  cards: Card[];
  events: EventLite[];
  taxEnabled: boolean;
  defaultEventId?: string;
  initial?: ExpenseData;
  action: (formData: FormData) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "CREDIT_CARD");
  const [category, setCategory] = useState(initial?.category ?? "OTHER");
  const [taxOn, setTaxOn] = useState(taxEnabled);
  const inferredType =
    EXPENSE_CATEGORIES.find((c) => c.value === category)?.type ?? "NON_GEAR";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Date</label>
        <input type="date" name="date" required defaultValue={formatDateInput(initial?.date) || formatDateInput(new Date())} className="input" />
      </div>
      <div>
        <label className="label">Vendor / store</label>
        <input name="vendor" defaultValue={initial?.vendor ?? ""} placeholder="e.g. Henry's Camera" className="input" />
      </div>

      <div>
        <label className="label">Category *</label>
        <select
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Expense type</label>
        <select name="expenseType" defaultValue={initial?.expenseType ?? inferredType} className="input">
          <option value="GEAR">Gear (capital)</option>
          <option value="NON_GEAR">Non-gear (operating)</option>
        </select>
        <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Defaults from category — adjust if needed.</p>
      </div>

      <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {taxOn ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Subtotal</label>
              <input type="number" step="0.01" name="subtotal" defaultValue={initial?.subtotal ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Tax</label>
              <input type="number" step="0.01" name="taxAmount" defaultValue={initial?.taxAmount ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Total *</label>
              <input type="number" step="0.01" name="total" required defaultValue={initial?.total ?? ""} className="input" />
            </div>
            <label className="sm:col-span-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="taxIncluded" defaultChecked={initial?.taxIncluded ?? false} />
              Tax included in total
            </label>
          </div>
        ) : (
          <div>
            <label className="label">Amount *</label>
            <input type="number" step="0.01" name="total" required defaultValue={initial?.total ?? ""} className="input" />
          </div>
        )}
        <button
          type="button"
          className="text-xs mt-2 font-medium text-brand-600 hover:underline"
          onClick={() => setTaxOn((v) => !v)}
        >
          {taxOn ? "Use single amount" : "Use subtotal + tax"}
        </button>
      </div>

      <div>
        <label className="label">Payment method *</label>
        <select
          name="paymentMethod"
          required
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="input"
        >
          {PAYMENT_METHODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {paymentMethod === "CREDIT_CARD" && (
        <div>
          <label className="label">Credit card *</label>
          <select name="creditCardId" required defaultValue={initial?.creditCardId ?? ""} className="input">
            <option value="">— Choose card —</option>
            {cards.filter((c) => c.active || c.id === initial?.creditCardId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.last4 ? ` •••• ${c.last4}` : ""}</option>
            ))}
          </select>
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="label">Linked event (optional)</label>
        <select name="eventId" defaultValue={initial?.eventId ?? defaultEventId ?? ""} className="input">
          <option value="">— None (general business expense) —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Receipt photo(s) / file(s) (optional)</label>
        <input
          type="file"
          name="receiptFile"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pick more than one for multi-page receipts. On mobile, opens your camera so you can snap each page.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" />
      </div>

      <div className="sm:col-span-2 flex justify-end">
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
