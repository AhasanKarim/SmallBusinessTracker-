import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate, monthKey, monthLabel } from "@/lib/utils";
import { categoryLabel } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [settings, incomes, expenses, cards] = await Promise.all([
    prisma.businessSettings.findUnique({ where: { id: "singleton" } }),
    prisma.income.findMany({ orderBy: { date: "desc" }, include: { event: true, creditCard: true } }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, include: { event: true, creditCard: true } }),
    prisma.creditCard.findMany(),
  ]);

  const currency = settings?.currency || "CAD";
  const now = new Date();
  const ym = monthKey(now);
  const yyyy = String(now.getFullYear());

  const totalEarned = incomes.reduce((s, i) => s + i.total, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.total, 0);
  const profit = totalEarned - totalSpent;
  const gearTotal = expenses.filter((e) => e.expenseType === "GEAR").reduce((s, e) => s + e.total, 0);
  const nonGearTotal = expenses.filter((e) => e.expenseType === "NON_GEAR").reduce((s, e) => s + e.total, 0);

  const monthIncome = incomes.filter((i) => monthKey(i.date) === ym).reduce((s, i) => s + i.total, 0);
  const monthExpense = expenses.filter((e) => monthKey(e.date) === ym).reduce((s, e) => s + e.total, 0);
  const yearIncome = incomes.filter((i) => i.date.getFullYear() === now.getFullYear()).reduce((s, i) => s + i.total, 0);
  const yearExpense = expenses.filter((e) => e.date.getFullYear() === now.getFullYear()).reduce((s, e) => s + e.total, 0);

  // Spending by category
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.total);
  }
  const categoryRows = [...byCategory.entries()]
    .map(([k, v]) => ({ key: k, label: categoryLabel(k), total: v }))
    .sort((a, b) => b.total - a.total);

  // Spending by credit card
  const byCard = new Map<string, number>();
  for (const e of expenses) {
    if (e.creditCardId) byCard.set(e.creditCardId, (byCard.get(e.creditCardId) ?? 0) + e.total);
  }
  const cardRows = cards
    .map((c) => ({ id: c.id, name: c.name, last4: c.last4, total: byCard.get(c.id) ?? 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    currency,
    totals: { totalEarned, totalSpent, profit, gearTotal, nonGearTotal, monthIncome, monthExpense, yearIncome, yearExpense, ym, yyyy },
    recentIncomes: incomes.slice(0, 5),
    recentExpenses: expenses.slice(0, 5),
    categoryRows,
    cardRows,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { currency, totals, recentIncomes, recentExpenses, categoryRows, cardRows } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="At-a-glance view of your business finances"
        action={
          <>
            <Link href="/income" className="btn-secondary">+ Income</Link>
            <Link href="/expenses" className="btn-primary">+ Expense</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat title="Total earned" value={formatMoney(totals.totalEarned, currency)} accent="green" />
        <Stat title="Total spent" value={formatMoney(totals.totalSpent, currency)} accent="red" />
        <Stat title="Profit" value={formatMoney(totals.profit, currency)} accent={totals.profit >= 0 ? "green" : "red"} />
        <Stat title="Gear / non-gear" value={`${formatMoney(totals.gearTotal, currency)} · ${formatMoney(totals.nonGearTotal, currency)}`} accent="slate" small />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat title={`This month income (${monthLabel(totals.ym)})`} value={formatMoney(totals.monthIncome, currency)} accent="green" small />
        <Stat title={`This month expense`} value={formatMoney(totals.monthExpense, currency)} accent="red" small />
        <Stat title={`${totals.yyyy} income`} value={formatMoney(totals.yearIncome, currency)} accent="green" small />
        <Stat title={`${totals.yyyy} expense`} value={formatMoney(totals.yearExpense, currency)} accent="red" small />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Recent income</h2>
            <Link className="text-xs font-medium text-brand-600 hover:underline" href="/income">View all →</Link>
          </header>
          {recentIncomes.length === 0 ? (
            <p className="text-sm text-center px-4 py-8 text-slate-500 dark:text-slate-400">No income yet</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentIncomes.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.clientName || i.event?.name || "Income"}</p>
                    <p className="text-xs truncate text-slate-500 dark:text-slate-400">{formatDate(i.date)}{i.event ? ` • ${i.event.name}` : ""}</p>
                  </div>
                  <span className="text-sm ml-2 font-semibold text-green-700 dark:text-green-400">{formatMoney(i.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Recent expenses</h2>
            <Link className="text-xs font-medium text-brand-600 hover:underline" href="/expenses">View all →</Link>
          </header>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-center px-4 py-8 text-slate-500 dark:text-slate-400">No expenses yet</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.vendor || categoryLabel(e.category)}</p>
                    <p className="text-xs truncate text-slate-500 dark:text-slate-400">
                      {formatDate(e.date)} • {categoryLabel(e.category)}
                      {e.creditCard ? ` • ${e.creditCard.name}` : ""}
                    </p>
                  </div>
                  <span className="text-sm ml-2 font-semibold text-red-700 dark:text-red-400">{formatMoney(e.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Spending by category</h2>
          </header>
          {categoryRows.length === 0 ? (
            <p className="text-sm text-center px-4 py-8 text-slate-500 dark:text-slate-400">No expenses yet</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {categoryRows.slice(0, 8).map((row) => {
                const pct = totals.totalSpent > 0 ? (row.total / totals.totalSpent) * 100 : 0;
                return (
                  <li key={row.key} className="px-4 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatMoney(row.total, currency)}</span>
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

        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold">Spending by credit card</h2>
            <Link className="text-xs font-medium text-brand-600 hover:underline" href="/cards">Manage →</Link>
          </header>
          {cardRows.length === 0 ? (
            <p className="text-sm text-center px-4 py-8 text-slate-500 dark:text-slate-400">No card spending yet</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {cardRows.map((row) => {
                const pct = totals.totalSpent > 0 ? (row.total / totals.totalSpent) * 100 : 0;
                return (
                  <li key={row.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {row.name}
                        {row.last4 && <span className="text-sm ml-1 text-slate-400 dark:text-slate-400">•••• {row.last4}</span>}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatMoney(row.total, currency)}</span>
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
      </div>
    </>
  );
}

function Stat({
  title,
  value,
  accent = "slate",
  small = false,
}: {
  title: string;
  value: string;
  accent?: "green" | "red" | "slate";
  small?: boolean;
}) {
  const tone =
    accent === "green"
      ? "text-green-700 dark:text-green-400"
      : accent === "red"
        ? "text-red-700 dark:text-red-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] truncate font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`mt-1 ${small ? "text-base" : "text-xl"} font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
