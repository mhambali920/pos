import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "IDR"): string {
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}
