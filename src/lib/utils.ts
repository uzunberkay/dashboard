import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string) {
  const target = new Date(date).getTime()
  const deltaMs = target - Date.now()
  const deltaMinutes = Math.round(deltaMs / (1000 * 60))
  const formatter = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" })

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute")
  }

  const deltaHours = Math.round(deltaMinutes / 60)
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour")
  }

  const deltaDays = Math.round(deltaHours / 24)
  if (Math.abs(deltaDays) < 30) {
    return formatter.format(deltaDays, "day")
  }

  const deltaMonths = Math.round(deltaDays / 30)
  return formatter.format(deltaMonths, "month")
}

export function getMonthRange(date?: Date) {
  const d = date || new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}
