import { prisma } from "@/lib/prisma";
import { toCSV, formatDate } from "@/lib/utils";
import { categoryLabel, paymentMethodLabel } from "@/lib/constants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const type = url.searchParams.get("type") || "expenses";
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  let csv = "";
  let filename = "";

  if (type === "incomes" || type === "income") {
    const incomes = await prisma.income.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
      include: { event: true, creditCard: true },
    });
    csv = toCSV(
      incomes.map((i) => ({
        date: formatDate(i.date, "yyyy-MM-dd"),
        client: i.clientName ?? "",
        event: i.event?.name ?? "",
        invoice_number: i.invoiceNumber ?? "",
        invoice_sent: i.invoiceSent ? "yes" : "no",
        payment_method: paymentMethodLabel(i.paymentMethod),
        credit_card: i.creditCard?.name ?? "",
        subtotal: i.subtotal ?? "",
        tax: i.taxAmount ?? "",
        total: i.total,
        notes: i.notes ?? "",
      })),
    );
    filename = `income-${year}.csv`;
  } else {
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
      include: { event: true, creditCard: true },
    });
    csv = toCSV(
      expenses.map((e) => ({
        date: formatDate(e.date, "yyyy-MM-dd"),
        vendor: e.vendor ?? "",
        category: categoryLabel(e.category),
        type: e.expenseType === "GEAR" ? "Gear" : "Non-gear",
        event: e.event?.name ?? "",
        payment_method: paymentMethodLabel(e.paymentMethod),
        credit_card: e.creditCard?.name ?? "",
        subtotal: e.subtotal ?? "",
        tax: e.taxAmount ?? "",
        total: e.total,
        notes: e.notes ?? "",
      })),
    );
    filename = `expenses-${year}.csv`;
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
