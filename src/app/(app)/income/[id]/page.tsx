import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { IncomeForm } from "@/components/IncomeForm";
import { updateIncome, deleteIncome, deleteIncomeDocument } from "../actions";

export const dynamic = "force-dynamic";

export default async function IncomeEditPage({ params }: { params: { id: string } }) {
  const [income, events, cards, settings] = await Promise.all([
    prisma.income.findUnique({ where: { id: params.id }, include: { documents: true } }),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!income) notFound();

  const updateBound = updateIncome.bind(null, income.id);
  const deleteBound = async () => {
    "use server";
    await deleteIncome(income.id);
    redirect("/income");
  };

  return (
    <>
      <PageHeader
        title="Edit income"
        action={<Link href="/income" className="btn-ghost">← Back</Link>}
      />
      <section className="card p-5">
        <IncomeForm
          cards={cards}
          events={events}
          taxEnabled={settings?.taxRegistered ?? false}
          initial={income}
          action={updateBound}
          submitLabel="Save changes"
        />
      </section>

      {income.documents.length > 0 && (
        <section className="card mt-4 overflow-hidden">
          <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Attached files ({income.documents.length})</h2>
          </header>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {income.documents.map((d) => {
              const removeDoc = async () => {
                "use server";
                await deleteIncomeDocument(d.id);
              };
              return (
                <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.filename}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{(d.sizeBytes / 1024).toFixed(0)} KB · {d.mimeType}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a className="btn-ghost text-xs" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">Open</a>
                    <form action={removeDoc}>
                      <button type="submit" className="btn-ghost text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" formNoValidate>
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 flex justify-end">
        <form action={deleteBound}>
          <button type="submit" className="btn-danger" formNoValidate>Delete income</button>
        </form>
      </section>
    </>
  );
}
