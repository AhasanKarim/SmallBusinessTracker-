import { format } from "date-fns";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number, currency = "CAD"): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDate(d: Date | string | null | undefined, fmt = "MMM d, yyyy"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, fmt);
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  if (!start && !end) return "—";
  if (!start) return formatDate(end);
  if (!end) return formatDate(start);
  const a = typeof start === "string" ? new Date(start) : start;
  const b = typeof end === "string" ? new Date(end) : end;
  if (a.getTime() === b.getTime()) return formatDate(a);
  // Same year + month: "Apr 28 – 30, 2026"
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`;
  }
  // Same year: "Apr 28 – May 2, 2026"
  if (a.getFullYear() === b.getFullYear()) {
    return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  }
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}

export function formatDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function parseMoney(value: FormDataEntryValue | null): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseOptionalMoney(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseDate(value: FormDataEntryValue | null): Date {
  if (!value) return new Date();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) {
    return (headers ?? []).join(",") + "\n";
  }
  const cols = headers ?? Object.keys(rows[0]);
  const head = cols.map(csvEscape).join(",");
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","));
  return [head, ...body].join("\n") + "\n";
}

export function monthKey(d: Date): string {
  return format(d, "yyyy-MM");
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}
