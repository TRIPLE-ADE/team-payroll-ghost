import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { APP_CURRENCY_CODE } from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: APP_CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
