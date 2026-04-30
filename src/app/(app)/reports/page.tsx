import { prisma } from "@/lib/prisma";
import { formatMoney, monthKey, monthLabel } from "@/lib/utils";
import { categoryLabel, paymentMethodLabel } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const now = new Date();
  const year = Number(searchParams?.year) || now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [incomes, expenses, settings, cards] = await Promise.all([
    prisma.income.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
    prisma.creditCard.findMany(),
  ]);
  const currency = settings?.currency || "CAD";
  const taxOn = settings?.taxRegistered ?? false;

  // Monthly aggregation
  const months: { key: string; label: string; income: number; expense: number; profit: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const k = monthKey(new Date(year, m, 1));
    months.push({ key: k, label: monthLabel(k), income: 0, expense: 0, profit: 0 });
  }
  const idx: Record<string, number> = {};
  months.forEach((row, i) => (idx[row.key] = i));
  for (const i of incomes) {
    const k = monthKey(i.date);
    if (k in idx) months[idx[k]].income += i.total;
  }
  for (const e of expenses) {
    const k = monthKey(e.date);
    if (k in idx) months[idx[k]].expense += e.total;
  }
  months.forEach((m) => (m.profit = m.income - m.expense));

  const totalIncome = incomes.reduce((s, i) => s + i.total, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.total, 0);
  const gearTotal = expenses.filter((e) => e.expenseType === "GEAR").reduce((s, e) => s + e.total, 0);
  const nonGearTotal = totalExpense - gearTotal;

  const byCategory = aggBy(expenses, (e) => e.category);
  const byPaymentMethodInc = aggBy(incomes, (i) => i.paymentMethod);
  const byPaymentMethodExp = aggBy(expenses, (e) => e.paymentMethod);
  const byCard = aggBy(expenses.filter((e) => e.creditCardId), (e) => e.creditCardId!);

  const taxCollected = incomes.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
  const taxPaid = expenses.reduce((s, e) => s + (e.taxAmount ?? 0), 0);

  const years = await getKnownYears();

  return (
    <>
      <PageHeader
        title={`Reports — ${year}`}
        description="Financial summary, by month and breakdown."
        action={
          <>
            <form method="GET" className="flex items-center gap-1">
              <select name="year" defaultValue={year} className="input max-w-[120px]">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button className="btn-secondary" type="submit">Go</button>
            </form>
            <a className="btn-primary" href={`/api/reports/csv?year=${year}&type=expenses`}>Export expenses CSV</a>
            <a className="btn-secondary" href={`/api/reports/csv?year=${year}&type=incomes`}>Export income CSV</a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat title="Income" value={formatMoney(totalIncome, currency)} accent="green" />
        <Stat title="Expenses" value={formatMoney(totalExpense, currency)} accent="red" />
        <Stat title="Profit" value={formatMoney(totalIncome - totalExpense, currency)} accent={totalIncome - totalExpense >= 0 ? "green" : "red"} />
        <Stat title="Gear / non-gear" value={`${formatMoney(gearTotal, currency)} / ${formatMoney(nonGearTotal, currency)}`} small />
      </div>

      {taxOn && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat title="Tax collected (income)" value={formatMoney(taxCollected, currency)} accent="green" small />
          <Stat title="Tax paid (expenses)" value={formatMoney(taxPaid, currency)} accent="red" small />
          <Stat title="Net tax estimate" value={formatMoney(taxCollected - taxPaid, currency)} small />
        </div>
      )}

      <section className="card mt-6 overflow-hidden">
        <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold">Monthly</h2>
        </header>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="table-head">Month</th>
                <th className="table-head text-right">Income</th>
                <th className="table-head text-right">Expense</th>
                <th className="table-head text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {months.map((m) => (
                <tr key={m.key}>
                  <td className="table-cell">{m.label}</td>
                  <td className="text-sm table-cell text-right tabular-nums text-green-700 dark:text-green-400">{formatMoney(m.income, currency)}</td>
                  <td className="text-sm table-cell text-right tabular-nums text-red-700 dark:text-red-400">{formatMoney(m.expense, currency)}</td>
                  <td className={`text-sm table-cell text-right tabular-nums font-semibold ${m.profit >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {formatMoney(m.profit, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Expenses by category"
          rows={byCategory.entries.map(([k, v]) => ({ label: categoryLabel(k), value: v }))}
          total={byCategory.total}
          currency={currency}
        />
        <BreakdownCard
          title="Expenses by credit card"
          rows={byCard.entries.map(([k, v]) => ({
            label: cards.find((c) => c.id === k)?.name ?? "Unknown",
            value: v,
          }))}
          total={byCard.total}
          currency={currency}
        />
        <BreakdownCard
          title="Income by payment method"
          rows={byPaymentMethodInc.entries.map(([k, v]) => ({ label: paymentMethodLabel(k), value: v }))}
          total={byPaymentMethodInc.total}
          currency={currency}
        />
        <BreakdownCard
          title="Expenses by payment method"
          rows={byPaymentMethodExp.entries.map(([k, v]) => ({ label: paymentMethodLabel(k), value: v }))}
          total={byPaymentMethodExp.total}
          currency={currency}
        />
      </div>
    </>
  );
}

async function getKnownYears(): Promise<number[]> {
  const [firstInc, firstExp] = await Promise.all([
    prisma.income.findFirst({ orderBy: { date: "asc" } }),
    prisma.expense.findFirst({ orderBy: { date: "asc" } }),
  ]);
  const earliest = Math.min(
    firstInc?.date.getFullYear() ?? new Date().getFullYear(),
    firstExp?.date.getFullYear() ?? new Date().getFullYear(),
  );
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= earliest; y--) years.push(y);
  return years.length > 0 ? years : [current];
}

function aggBy<T>(rows: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const k = key(r);
    const v = (r as unknown as { total: number }).total;
    m.set(k, (m.get(k) ?? 0) + v);
    total += v;
  }
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return { entries, total };
}

function Stat({ title, value, accent = "slate", small = false }: { title: string; value: string; accent?: "green" | "red" | "slate"; small?: boolean }) {
  const tone = accent === "green" ? "text-green-700 dark:text-green-400" : accent === "red" ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] truncate font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`mt-1 ${small ? "text-base" : "text-xl"} font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  total,
  currency,
}: {
  title: string;
  rows: { label: string; value: number }[];
  total: number;
  currency: string;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-center px-4 py-8 text-slate-500 dark:text-slate-400">No data</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((r) => {
            const pct = total > 0 ? (r.value / total) * 100 : 0;
            return (
              <li key={r.label} className="px-4 py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(r.value, currency)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
