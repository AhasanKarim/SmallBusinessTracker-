// Shared enum-style constants. Stored as strings in the DB so the schema can
// evolve without migrations; UI labels live here.

export type PaymentMethod =
  | "CASH"
  | "DEBIT"
  | "CREDIT_CARD"
  | "ETRANSFER"
  | "CHEQUE"
  | "OTHER";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "ETRANSFER", label: "E-Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export type ExpenseCategory =
  | "GEAR"
  | "COFFEE_TEAM_FOOD"
  | "MEALS"
  | "GAS"
  | "RIDE"
  | "PARKING"
  | "SOFTWARE"
  | "STUDIO_RENT"
  | "PROPS"
  | "PRINTING"
  | "MARKETING"
  | "OTHER";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; type: "GEAR" | "NON_GEAR" }[] = [
  { value: "GEAR", label: "Gear", type: "GEAR" },
  { value: "COFFEE_TEAM_FOOD", label: "Coffee / team food", type: "NON_GEAR" },
  { value: "MEALS", label: "Meals", type: "NON_GEAR" },
  { value: "GAS", label: "Gas", type: "NON_GEAR" },
  { value: "RIDE", label: "Ride / transportation", type: "NON_GEAR" },
  { value: "PARKING", label: "Parking", type: "NON_GEAR" },
  { value: "SOFTWARE", label: "Software / subscriptions", type: "NON_GEAR" },
  { value: "STUDIO_RENT", label: "Studio rent", type: "NON_GEAR" },
  { value: "PROPS", label: "Props", type: "NON_GEAR" },
  { value: "PRINTING", label: "Printing", type: "NON_GEAR" },
  { value: "MARKETING", label: "Marketing", type: "NON_GEAR" },
  { value: "OTHER", label: "Other", type: "NON_GEAR" },
];

export function categoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

export type DocumentKind = "RECEIPT" | "INVOICE" | "CONTRACT" | "OTHER";
export const DOCUMENT_KINDS: { value: DocumentKind; label: string }[] = [
  { value: "RECEIPT", label: "Receipt" },
  { value: "INVOICE", label: "Invoice" },
  { value: "CONTRACT", label: "Contract" },
  { value: "OTHER", label: "Other" },
];

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export function derivePaymentStatus(invoiceTotal: number, paid: number): PaymentStatus {
  if (paid <= 0) return "UNPAID";
  if (paid + 0.005 >= invoiceTotal) return "PAID";
  return "PARTIAL";
}
