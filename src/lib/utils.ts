import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isAuthError(status: number, body: any) {
  if (status === 401) return true
  if (body && body.ok === false && typeof body.message === 'string') {
      return body.message.toLowerCase().includes('not authenticated')
          || body.message.toLowerCase().includes('session expired')
  }
  return false
}
function parseAsUtcIfNoTimezone(input: string | Date): Date {
  if (input instanceof Date) return input
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(input)
  const normalized = hasTimezone ? input : `${input}Z`
  return new Date(normalized)
}

export function formatRelativeTime(input: string | Date): string {
  const date = parseAsUtcIfNoTimezone(input)
  if (Number.isNaN(date.getTime())) return String(input)

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return '剛剛'
  if (diffSec < 60) return `${diffSec} 秒前`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} 分鐘前`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小時前`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`

  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
export function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}