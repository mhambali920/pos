export { cn } from "cn";

export function formatCurrency(
  amount: number | string,
  currency = "IDR",
  locale = "id-ID"
): string {
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}
