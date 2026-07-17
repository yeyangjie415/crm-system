import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Deadline label with color coding for task lists */
export function getDeadlineLabel(deadline: string) {
  const today = new Date()
  const d = new Date(deadline)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: '已逾期', color: 'text-red-500 bg-red-50' }
  if (diff === 0) return { label: '今天', color: 'text-red-500 bg-red-50' }
  if (diff === 1) return { label: '明天', color: 'text-amber-500 bg-amber-50' }
  if (diff <= 7) return { label: '本周', color: 'text-slate-500 bg-slate-100' }
  return { label: deadline, color: 'text-slate-400 bg-slate-50' }
}

/** Format number as CNY currency string */
export function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

/** Format large amounts to compact form (e.g. ¥32.0万, ¥1.2M) */
export function formatLargeAmount(amount: number): string {
  if (amount >= 100000000) return `¥${(amount / 100000000).toFixed(1)}亿`
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
  return `¥${amount.toLocaleString()}`
}
