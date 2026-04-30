"use client";

import { useState } from "react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDateInput } from "@/lib/utils";

type Card = { id: string; name: string; last4: string | null; active: boolean };
type EventLite = { id: string; name: string };
type IncomeData = {
  id: string;
  date: Date | string;
  clientName: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  total: number;
  taxIncluded: boolean;
  paymentMethod: string;
  transactionId: string | null;
  etransferEmail: string | null;
  invoiceNumber: string | null;
  invoiceSent: boolean;
  notes: string | null;
  eventId: string | null;
  creditCardId: string | null;
};

export function IncomeForm({
  cards,
  events,
  taxEnabled,
  defaultEventId,
  initial,
  action,
  submitLabel = "Save",
  showInvoiceUpload = true,
}: {
  cards: Card[];
  events: EventLite[];
  taxEnabled: boolean;
  defaultEventId?: string;
  initial?: IncomeData;
  action: (formData: FormData) => Promise<void> | void;
  submitLabel?: string;
  showInvoiceUpload?: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "ETRANSFER");
  const [taxOn, setTaxOn] = useState(taxEnabled);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Date</label>
        <input type="date" name="date" required defaultValue={formatDateInput(initial?.date) || formatDateInput(new Date())} className="input" />
      </div>
      <div>
        <label className="label">Client name</label>
        <input name="clientName" defaultValue={initial?.clientName ?? ""} className="input" />
      </div>

      <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
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
          className="mt-2 text-xs font-medium text-brand-600 hover:underline"
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

      {paymentMethod === "ETRANSFER" && (
        <>
          <div>
            <label className="label">E-transfer recipient email</label>
            <input
              type="email"
              name="etransferEmail"
              defaultValue={initial?.etransferEmail ?? ""}
              placeholder="business@example.com"
              className="input"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The email the client sent the e-transfer to.</p>
          </div>
          <div>
            <label className="label">Transaction ID / reference #</label>
            <input
              name="transactionId"
              defaultValue={initial?.transactionId ?? ""}
              placeholder="e.g. CA12345678901"
              className="input"
            />
          </div>
        </>
      )}

      <div>
        <label className="label">Linked event</label>
        <select name="eventId" defaultValue={initial?.eventId ?? defaultEventId ?? ""} className="input">
          <option value="">— None —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Invoice number</label>
        <input name="invoiceNumber" defaultValue={initial?.invoiceNumber ?? ""} className="input" />
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="invoiceSent" defaultChecked={initial?.invoiceSent ?? false} />
        Invoice sent to client
      </label>

      {showInvoiceUpload && (
        <div className="sm:col-span-2">
          <label className="label">Upload invoice / supporting files (optional)</label>
          <input
            type="file"
            name="invoiceFile"
            accept="image/*,application/pdf"
            capture="environment"
            multiple
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            PDFs or photos. Pick multiple to attach more than one. On mobile, opens your camera.
          </p>
        </div>
      )}

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
