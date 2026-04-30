import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { createCard, updateCard, deleteCard, toggleCard } from "./actions";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const [cards, settings, expenses, incomes] = await Promise.all([
    prisma.creditCard.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
    prisma.expense.findMany({ where: { creditCardId: { not: null } }, select: { creditCardId: true, total: true } }),
    prisma.income.findMany({ where: { creditCardId: { not: null } }, select: { creditCardId: true, total: true } }),
  ]);
  const currency = settings?.currency || "CAD";

  const expenseByCard = new Map<string, number>();
  for (const e of expenses) if (e.creditCardId) expenseByCard.set(e.creditCardId, (expenseByCard.get(e.creditCardId) ?? 0) + e.total);
  const incomeByCard = new Map<string, number>();
  for (const i of incomes) if (i.creditCardId) incomeByCard.set(i.creditCardId, (incomeByCard.get(i.creditCardId) ?? 0) + i.total);

  return (
    <>
      <PageHeader
        title="Credit Cards"
        description="Add the cards you use for the business — pick from this list when logging payments."
        action={<a href="#new-card" className="btn-primary">+ Add card</a>}
      />

      {cards.length === 0 ? (
        <EmptyState title="No credit cards yet" description="Add your first card below." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const update = updateCard.bind(null, c.id);
            const del = async () => { "use server"; await deleteCard(c.id); };
            const toggle = async () => { "use server"; await toggleCard(c.id); };
            return (
              <div key={c.id} className="card overflow-hidden">
                <div className="flex items-start justify-between bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs opacity-80">{c.last4 ? `•••• ${c.last4}` : "•••• ••••"}</p>
                  </div>
                  <form action={toggle}>
                    <button className={`text-sm badge ${c.active ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-900" : "bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-red-50 px-2 py-1.5 dark:bg-red-900/30">
                      <p className="text-sm uppercase text-red-700 dark:text-red-400">Spent</p>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{formatMoney(expenseByCard.get(c.id) ?? 0, currency)}</p>
                    </div>
                    <div className="rounded bg-green-50 px-2 py-1.5 dark:bg-green-900/30">
                      <p className="text-sm uppercase text-green-700 dark:text-green-400">Earned</p>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">{formatMoney(incomeByCard.get(c.id) ?? 0, currency)}</p>
                    </div>
                  </div>
                  {c.notes && <p className="text-sm text-slate-600 dark:text-slate-400">{c.notes}</p>}
                  <details className="rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    <summary className="text-sm cursor-pointer px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50">
                      Edit
                    </summary>
                    <form action={update} className="space-y-2 p-3">
                      <input name="name" required defaultValue={c.name} className="input" placeholder="Card name" />
                      <input name="last4" defaultValue={c.last4 ?? ""} maxLength={4} className="input" placeholder="Last 4 digits" />
                      <textarea name="notes" rows={2} defaultValue={c.notes ?? ""} className="input" placeholder="Notes" />
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="active" defaultChecked={c.active} /> Active
                      </label>
                      <div className="flex gap-2">
                        <button className="btn-primary flex-1 text-xs" type="submit">Save</button>
                      </div>
                    </form>
                    <form action={del} className="border border-slate-100 p-2 dark:border-slate-700">
                      <button className="text-sm btn-ghost w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/30 dark:text-red-400" type="submit" formNoValidate>
                        Delete card
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section id="new-card" className="card mt-6 max-w-md p-5">
        <h2 className="mb-3 text-base font-semibold">Add credit card</h2>
        <form action={createCard} className="space-y-3">
          <div>
            <label className="label">Card name *</label>
            <input name="name" required placeholder="e.g. Amex Cobalt" className="input" />
          </div>
          <div>
            <label className="label">Last 4 digits (optional)</label>
            <input name="last4" maxLength={4} placeholder="1234" className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={2} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked /> Active
          </label>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit">Add card</button>
          </div>
        </form>
      </section>
    </>
  );
}
