import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ExpenseForm } from "@/components/ExpenseForm";
import { updateExpense, deleteExpense, deleteExpenseDocument } from "../actions";

export const dynamic = "force-dynamic";

export default async function ExpenseEditPage({ params }: { params: { id: string } }) {
  const [expense, events, cards, settings] = await Promise.all([
    prisma.expense.findUnique({ where: { id: params.id }, include: { documents: true } }),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!expense) notFound();

  const updateBound = updateExpense.bind(null, expense.id);
  const deleteBound = async () => {
    "use server";
    await deleteExpense(expense.id);
    redirect("/expenses");
  };

  return (
    <>
      <PageHeader
        title="Edit expense"
        action={<Link href="/expenses" className="btn-ghost">← Back</Link>}
      />
      <section className="card p-5">
        <ExpenseForm
          cards={cards}
          events={events}
          taxEnabled={settings?.taxRegistered ?? false}
          initial={expense}
          action={updateBound}
          submitLabel="Save changes"
        />
      </section>

      {expense.documents.length > 0 && (
        <section className="card mt-4 overflow-hidden">
          <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Attached files ({expense.documents.length})</h2>
          </header>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {expense.documents.map((d) => {
              const removeDoc = async () => {
                "use server";
                await deleteExpenseDocument(d.id);
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
          <button type="submit" className="btn-danger" formNoValidate>Delete expense</button>
        </form>
      </section>
    </>
  );
}
