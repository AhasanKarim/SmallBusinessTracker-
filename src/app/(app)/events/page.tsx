import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateRange } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";
  const status = searchParams?.status ?? "";

  const events = await prisma.event.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { clientName: { contains: q } },
                { location: { contains: q } },
              ],
            }
          : {},
        status ? { paymentStatus: status } : {},
      ],
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });
  const settings = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  const currency = settings?.currency || "CAD";

  return (
    <>
      <PageHeader
        title="Events / Jobs"
        description="Photography shoots and other job records"
        action={<a href="#new-event" className="btn-primary">+ New event</a>}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, client, location"
          className="input flex-1 min-w-[200px]"
        />
        <select name="status" defaultValue={status} className="input max-w-[160px]">
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Add your first job to start tracking income, expenses, and documents against it."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="table-head">Event</th>
                  <th className="table-head">Client</th>
                  <th className="table-head">Date(s)</th>
                  <th className="table-head text-right">Invoice</th>
                  <th className="table-head text-right">Paid</th>
                  <th className="table-head">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="table-cell">
                      <Link href={`/events/${e.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                        {e.name}
                      </Link>
                      {e.location && <p className="text-xs text-slate-500 dark:text-slate-400">{e.location}</p>}
                    </td>
                    <td className="table-cell">{e.clientName ?? "—"}</td>
                    <td className="table-cell whitespace-nowrap">{formatDateRange(e.eventDate, e.endDate)}</td>
                    <td className="table-cell text-right tabular-nums">{formatMoney(e.invoiceTotal, currency)}</td>
                    <td className="table-cell text-right tabular-nums">{formatMoney(e.amountPaid, currency)}</td>
                    <td className="table-cell"><StatusBadge status={e.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section id="new-event" className="card mt-6 p-5">
        <h2 className="mb-3 text-base font-semibold">New event</h2>
        <form action={createEvent} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Event name *</label>
            <input name="name" required className="input" placeholder="Smith Wedding" />
          </div>
          <div>
            <label className="label">Client name</label>
            <input name="clientName" className="input" placeholder="Alex Smith" />
          </div>
          <div>
            <label className="label">Location</label>
            <input name="location" className="input" placeholder="Halifax, NS" />
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" name="eventDate" className="input" />
          </div>
          <div>
            <label className="label">End date <span className="font-normal normal-case text-slate-400">(multi-day — optional)</span></label>
            <input type="date" name="endDate" className="input" />
          </div>
          <div>
            <label className="label">Invoice total</label>
            <input type="number" step="0.01" name="invoiceTotal" defaultValue="0" className="input" />
          </div>
          <div>
            <label className="label">Amount paid</label>
            <input type="number" step="0.01" name="amountPaid" defaultValue="0" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" rows={3} className="input" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary">Create event</button>
          </div>
        </form>
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") return <span className="badge-green">Paid</span>;
  if (status === "PARTIAL") return <span className="badge-yellow">Partial</span>;
  return <span className="badge-red">Unpaid</span>;
}
