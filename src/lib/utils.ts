import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  amount: number | string | { toString: () => string },
  currencySymbol: string = "₱"
) {
  const numericAmount = typeof amount === "number" ? amount : Number(amount.toString());
  if (isNaN(numericAmount)) return `${currencySymbol}0`;
  const formattedNumber = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericAmount);

  const symbol = currencySymbol === "PHP" ? "₱" : currencySymbol;
  return `${symbol}${formattedNumber}`;
}
