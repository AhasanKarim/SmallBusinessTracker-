import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { IncomeForm } from "@/components/IncomeForm";
import { createIncome, deleteIncome } from "./actions";

export const dynamic = "force-dynamic";

export default async function IncomePage({
  searchParams,
}: {
  searchParams?: { q?: string; eventId?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";
  const eventId = searchParams?.eventId ?? "";

  const [incomes, settings, events, cards] = await Promise.all([
    prisma.income.findMany({
      where: {
        AND: [
          q ? { OR: [{ clientName: { contains: q } }, { invoiceNumber: { contains: q } }, { notes: { contains: q } }] } : {},
          eventId ? { eventId } : {},
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
        title="Income"
        description="Track money received — by event, client, or general business income."
        action={<a href="#new-income" className="btn-primary">+ New income</a>}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="GET">
        <input name="q" defaultValue={q} placeholder="Search client, invoice #, notes" className="input flex-1 min-w-[200px]" />
        <select name="eventId" defaultValue={eventId} className="input max-w-[220px]">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      {incomes.length === 0 ? (
        <EmptyState title="No income recorded" description="Add your first income entry below." />
      ) : (
        <div className="card overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="table-head">Date</th>
                  <th className="table-head">Client / Event</th>
                  <th className="table-head">Method</th>
                  <th className="table-head">Invoice #</th>
                  <th className="table-head">Sent</th>
                  <th className="table-head text-right">Total</th>
                  <th className="table-head"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {incomes.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="table-cell whitespace-nowrap">{formatDate(i.date)}</td>
                    <td className="table-cell">
                      <p className="font-medium">{i.clientName ?? "—"}</p>
                      {i.event && <p className="text-sm text-slate-500 dark:text-slate-400">{i.event.name}</p>}
                    </td>
                    <td className="table-cell">
                      {paymentMethodLabel(i.paymentMethod)}
                      {i.creditCard && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">· {i.creditCard.name}</span>}
                      {i.paymentMethod === "ETRANSFER" && i.etransferEmail && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">→ {i.etransferEmail}</span>
                      )}
                      {i.paymentMethod === "ETRANSFER" && i.transactionId && (
                        <span className="block text-[10px] text-slate-400">#{i.transactionId}</span>
                      )}
                    </td>
                    <td className="table-cell">{i.invoiceNumber ?? "—"}</td>
                    <td className="table-cell">{i.invoiceSent ? <span className="badge-green">Sent</span> : <span className="badge-slate">No</span>}</td>
                    <td className="text-sm table-cell text-right font-semibold tabular-nums text-green-700 dark:text-green-400">{formatMoney(i.total, currency)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Link href={`/income/${i.id}`} className="btn-ghost px-2 text-xs">Edit</Link>
                        <DeleteForm id={i.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section id="new-income" className="card mt-6 p-5">
        <h2 className="mb-3 text-base font-semibold">New income</h2>
        <IncomeForm
          cards={cards}
          events={events}
          taxEnabled={settings?.taxRegistered ?? false}
          defaultEventId={eventId || undefined}
          action={createIncome}
          submitLabel="Add income"
        />
      </section>
    </>
  );
}

function DeleteForm({ id }: { id: string }) {
  const action = async () => {
    "use server";
    await deleteIncome(id);
  };
  return (
    <form action={action}>
      <button type="submit" className="text-sm btn-ghost px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/30 dark:text-red-400">Delete</button>
    </form>
  );
}
