import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate, formatDateInput } from "@/lib/utils";
import { categoryLabel, paymentMethodLabel } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { updateEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      incomes: { orderBy: { date: "desc" }, include: { creditCard: true } },
      expenses: { orderBy: { date: "desc" }, include: { creditCard: true } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!event) notFound();
  const settings = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  const currency = settings?.currency || "CAD";

  const totalIncome = event.incomes.reduce((s, i) => s + i.total, 0);
  const totalExpense = event.expenses.reduce((s, e) => s + e.total, 0);
  const remaining = event.invoiceTotal - event.amountPaid;

  const updateBound = updateEvent.bind(null, event.id);
  const deleteBound = async () => {
    "use server";
    await deleteEvent(event.id);
  };

  return (
    <>
      <PageHeader
        title={event.name}
        description={event.clientName ? `Client: ${event.clientName}` : undefined}
        action={<Link href="/events" className="btn-ghost">← Back to events</Link>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Invoice total" value={formatMoney(event.invoiceTotal, currency)} />
        <Stat label="Amount paid" value={formatMoney(event.amountPaid, currency)} accent="green" />
        <Stat label="Remaining" value={formatMoney(remaining, currency)} accent={remaining > 0 ? "red" : "slate"} />
        <Stat label="Net (income - expenses)" value={formatMoney(totalIncome - totalExpense, currency)} accent={totalIncome - totalExpense >= 0 ? "green" : "red"} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 text-base font-semibold">Edit event</h2>
        <form action={updateBound} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Event name</label>
            <input name="name" required className="input" defaultValue={event.name} />
          </div>
          <div>
            <label className="label">Client name</label>
            <input name="clientName" className="input" defaultValue={event.clientName ?? ""} />
          </div>
          <div>
            <label className="label">Location</label>
            <input name="location" className="input" defaultValue={event.location ?? ""} />
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" name="eventDate" className="input" defaultValue={formatDateInput(event.eventDate)} />
          </div>
          <div>
            <label className="label">End date <span className="font-normal normal-case text-slate-400">(multi-day — optional)</span></label>
            <input type="date" name="endDate" className="input" defaultValue={formatDateInput(event.endDate)} />
          </div>
          <div>
            <label className="label">Invoice total</label>
            <input type="number" step="0.01" name="invoiceTotal" defaultValue={event.invoiceTotal} className="input" />
          </div>
          <div>
            <label className="label">Amount paid</label>
            <input type="number" step="0.01" name="amountPaid" defaultValue={event.amountPaid} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" rows={3} className="input" defaultValue={event.notes ?? ""} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Linked income</h2>
            <Link href={`/income?eventId=${event.id}`} className="text-xs font-medium text-brand-600 hover:underline">+ Add income</Link>
          </header>
          {event.incomes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No income recorded for this event</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {event.incomes.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{formatDate(i.date)} — {paymentMethodLabel(i.paymentMethod)}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {i.invoiceNumber ? `${i.invoiceNumber} · ` : ""}
                      {i.creditCard ? i.creditCard.name : i.clientName ?? ""}
                    </p>
                  </div>
                  <span className="font-semibold text-green-700 tabular-nums dark:text-green-400">{formatMoney(i.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Linked expenses</h2>
            <Link href={`/expenses?eventId=${event.id}`} className="text-xs font-medium text-brand-600 hover:underline">+ Add expense</Link>
          </header>
          {event.expenses.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No expenses recorded for this event</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {event.expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.vendor ?? categoryLabel(e.category)}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(e.date)} · {categoryLabel(e.category)}
                      {e.creditCard ? ` · ${e.creditCard.name}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-red-700 tabular-nums dark:text-red-400">{formatMoney(e.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold">Documents</h2>
          <Link href={`/documents?eventId=${event.id}`} className="text-xs font-medium text-brand-600 hover:underline">+ Upload</Link>
        </header>
        {event.documents.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No documents linked yet</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {event.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.filename}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{d.kind.toLowerCase()} · {(d.sizeBytes / 1024).toFixed(0)} KB</p>
                </div>
                <a className="btn-ghost" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">Open</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 flex justify-end">
        <form action={deleteBound}>
          <button type="submit" className="btn-danger" formNoValidate>
            Delete event
          </button>
        </form>
      </section>
    </>
  );
}

function Stat({ label, value, accent = "slate" }: { label: string; value: string; accent?: "green" | "red" | "slate" }) {
  const tone =
    accent === "green"
      ? "text-green-700 dark:text-green-400"
      : accent === "red"
        ? "text-red-700 dark:text-red-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
