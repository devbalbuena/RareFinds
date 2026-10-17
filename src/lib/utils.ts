import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  amount: number | string | { toString: () => string },
  currency: string = "PHP"
) {
  const numericAmount = typeof amount === "number" ? amount : Number(amount.toString());
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}
