import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/utils";
import { categoryLabel, paymentMethodLabel, EXPENSE_CATEGORIES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseForm } from "@/components/ExpenseForm";
import { createExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: { q?: string; eventId?: string; category?: string; type?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";
  const eventId = searchParams?.eventId ?? "";
  const category = searchParams?.category ?? "";
  const type = searchParams?.type ?? "";

  const [expenses, settings, events, cards] = await Promise.all([
    prisma.expense.findMany({
      where: {
        AND: [
          q ? { OR: [{ vendor: { contains: q } }, { notes: { contains: q } }] } : {},
          eventId ? { eventId } : {},
          category ? { category } : {},
          type ? { expenseType: type } : {},
        ],
      },
      include: { event: true, creditCard: true, documents: true },
      orderBy: { date: "desc" },
    }),
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
  ]);
  const currency = settings?.currency || "CAD";

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track gear and operating expenses with receipt uploads."
        action={<a href="#new-expense" className="btn-primary">+ New expense</a>}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="GET">
        <input name="q" defaultValue={q} placeholder="Search vendor / notes" className="input flex-1 min-w-[180px]" />
        <select name="category" defaultValue={category} className="input max-w-[180px]">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select name="type" defaultValue={type} className="input max-w-[140px]">
          <option value="">Any type</option>
          <option value="GEAR">Gear</option>
          <option value="NON_GEAR">Non-gear</option>
        </select>
        <select name="eventId" defaultValue={eventId} className="input max-w-[200px]">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      {expenses.length === 0 ? (
        <EmptyState title="No expenses yet" description="Snap a receipt photo from your phone to get started." />
      ) : (
        <div className="card overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="table-head">Date</th>
                  <th className="table-head">Vendor</th>
                  <th className="table-head">Category</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Method</th>
                  <th className="table-head">Event</th>
                  <th className="table-head">Receipt</th>
                  <th className="table-head text-right">Total</th>
                  <th className="table-head"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="table-cell whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="table-cell">{e.vendor ?? "—"}</td>
                    <td className="table-cell">{categoryLabel(e.category)}</td>
                    <td className="table-cell">
                      {e.expenseType === "GEAR" ? <span className="badge-slate">Gear</span> : <span className="badge-slate">Non-gear</span>}
                    </td>
                    <td className="table-cell">
                      {paymentMethodLabel(e.paymentMethod)}
                      {e.creditCard && <span className="text-sm ml-1 text-slate-500 dark:text-slate-400">· {e.creditCard.name}</span>}
                    </td>
                    <td className="table-cell">{e.event?.name ?? "—"}</td>
                    <td className="table-cell">
                      {e.documents.length > 0 ? (
                        <a href={`/api/documents/${e.documents[0].id}/file`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">
                          View ({e.documents.length})
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-sm table-cell text-right font-semibold tabular-nums text-red-700 dark:text-red-400">{formatMoney(e.total, currency)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Link href={`/expenses/${e.id}`} className="btn-ghost px-2 text-xs">Edit</Link>
                        <DeleteForm id={e.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section id="new-expense" className="card mt-6 p-5">
        <h2 className="mb-3 text-base font-semibold">New expense</h2>
        <ExpenseForm
          cards={cards}
          events={events}
          taxEnabled={settings?.taxRegistered ?? false}
          defaultEventId={eventId || undefined}
          action={createExpense}
          submitLabel="Add expense"
        />
      </section>
    </>
  );
}

function DeleteForm({ id }: { id: string }) {
  const action = async () => {
    "use server";
    await deleteExpense(id);
  };
  return (
    <form action={action}>
      <button type="submit" className="text-sm btn-ghost px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/30 dark:text-red-400">Delete</button>
    </form>
  );
}
