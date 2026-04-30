import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { uploadDocument, deleteDocument } from "./actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { kind?: string; eventId?: string; q?: string };
}) {
  const kind = searchParams?.kind ?? "";
  const eventId = searchParams?.eventId ?? "";
  const q = searchParams?.q?.trim() ?? "";

  const [docs, events] = await Promise.all([
    prisma.document.findMany({
      where: {
        AND: [
          kind ? { kind } : {},
          eventId ? { eventId } : {},
          q ? { OR: [{ filename: { contains: q } }, { notes: { contains: q } }] } : {},
        ],
      },
      include: { event: true, income: true, expense: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Receipts, invoices, contracts and other files."
        action={<a href="#upload" className="btn-primary">+ Upload</a>}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="GET">
        <input name="q" defaultValue={q} placeholder="Search filename / notes" className="input flex-1 min-w-[200px]" />
        <select name="kind" defaultValue={kind} className="input max-w-[160px]">
          <option value="">All types</option>
          {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select name="eventId" defaultValue={eventId} className="input max-w-[200px]">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>

      {docs.length === 0 ? (
        <EmptyState title="No documents yet" description="Upload receipts, invoices and contracts here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => {
            const isImage = d.mimeType.startsWith("image/");
            const del = async () => { "use server"; await deleteDocument(d.id); };
            return (
              <div key={d.id} className="card overflow-hidden">
                <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="block">
                  {isImage ? (
                    <img
                      src={`/api/documents/${d.id}/file`}
                      alt={d.filename}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="text-sm flex h-40 items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
                      </svg>
                    </div>
                  )}
                </a>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium" title={d.filename}>{d.filename}</p>
                    <span className="badge-slate">{d.kind.toLowerCase()}</span>
                  </div>
                  <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
                    {formatDate(d.createdAt)} · {(d.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                  {(d.event || d.income || d.expense) && (
                    <p className="text-xs mt-1 truncate text-slate-500 dark:text-slate-400">
                      {d.event && <Link href={`/events/${d.event.id}`} className="hover:underline">📅 {d.event.name}</Link>}
                      {d.income && <Link href={`/income/${d.income.id}`} className="hover:underline">💰 income</Link>}
                      {d.expense && <Link href={`/expenses/${d.expense.id}`} className="hover:underline">🧾 expense</Link>}
                    </p>
                  )}
                  {d.notes && <p className="text-sm mt-1 line-clamp-2 text-slate-600 dark:text-slate-400">{d.notes}</p>}
                  <div className="mt-2 flex gap-2">
                    <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="btn-secondary flex-1 text-xs">
                      Open
                    </a>
                    <a href={`/api/documents/${d.id}/file?download=1`} className="btn-secondary flex-1 text-xs">
                      Download
                    </a>
                    <form action={del}>
                      <button className="text-sm btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/30 dark:text-red-400" type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section id="upload" className="card mt-6 max-w-xl p-5">
        <h2 className="mb-3 text-base font-semibold">Upload document</h2>
        <form action={uploadDocument} className="space-y-3">
          <div>
            <label className="label">File *</label>
            <input type="file" name="file" required accept="image/*,application/pdf" capture="environment" multiple className="input" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Photos, PDFs, scans. Pick more than one to upload several at once. On mobile, opens your camera directly.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select name="kind" className="input">
                {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Linked event</label>
              <select name="eventId" defaultValue={eventId} className="input">
                <option value="">— None —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={2} className="input" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Upload</button>
          </div>
        </form>
      </section>
    </>
  );
}
