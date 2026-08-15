import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { mapErrorKey, type Locale } from '@/lib/i18n'
import { TimeseriesAxis } from '@/types/timeseries'
import { MetricKey } from '@/components/history-data/history-data-view'
import { Meter, MeterStatus, PhaseMode } from '@/types/meter'
import { Gateway } from '@/types/gateway'
import { StatusDotState } from '@/components/overview/statusDot'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
export function isAuthError(status: number, body: any) {
    if (status === 401) return true
    if (body && body.ok === false && typeof body.message === 'string') {
        return (
            body.message.toLowerCase().includes('not authenticated') ||
            body.message.toLowerCase().includes('session expired')
        )
    }
    return false
}

export function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? mapErrorKey(err.message) : fallback
}

export function formatValue(value: number | null, suffix = '') {
    return value === null || value === undefined ? '—' : `${value.toFixed(2)}${suffix}`
}
export function formatLastPolledAt(value: string | null | undefined, t: (key: string) => string) {
    if (!value) {
        return t('overview.neverPolled')
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date)
}
function parseAsUtcIfNoTimezone(input: string | Date): Date {
    if (input instanceof Date) return input
    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(input)
    const normalized = hasTimezone ? input : `${input}Z`
    return new Date(normalized)
}
export function formatRelativeTime(input: string | Date, locale: Locale = 'zh-TW'): string {
    const date = parseAsUtcIfNoTimezone(input)
    if (Number.isNaN(date.getTime())) return String(input)

    const diffMs = Date.now() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (locale === 'en') {
        if (diffSec < 5) return 'Just now'
        if (diffSec < 60) return `${diffSec}s ago`
    } else {
        if (diffSec < 5) return '剛剛'
        if (diffSec < 60) return `${diffSec} 秒前`
    }

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return locale === 'en' ? `${diffMin}m ago` : `${diffMin} 分鐘前`

    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return locale === 'en' ? `${diffHour}h ago` : `${diffHour} 小時前`

    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return locale === 'en' ? `${diffDay}d ago` : `${diffDay} 天前`

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
}
export function getYDomain(data: { [key in MetricKey]: number | null }[], metrics: MetricKey[]): [number, number] {
    const values = data.flatMap((row) => metrics.flatMap((metric) => (row[metric] == null ? [] : [row[metric]!])))
    if (values.length === 0) return [0, 1]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = Math.max((max - min) * 0.08, Math.abs(max || min) * 0.02, 0.01)
    return [min - padding, max + padding]
}

function formatDateTimeLocal(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

export function getDefaultRange(axis: TimeseriesAxis, timeZone: string) {
    const now = new Date()
    const end = formatDateTimeLocal(now, timeZone)

    const parts = getLocalDateParts(now, timeZone)
    const localDay = Date.UTC(parts.year, parts.month - 1, parts.day)

    if (axis === 'minute') {
        const start = formatDateTimeLocal(new Date(now.getTime() - 60 * 60 * 1000), timeZone)
        return { start, end }
    }

    let start = localDay
    if (axis === 'hour') {
        const daysSinceMonday = (new Date(localDay).getUTCDay() + 6) % 7
        start -= daysSinceMonday * 24 * 60 * 60 * 1000
    } else if (axis === 'month') {
        start = Date.UTC(parts.year, 0, 1)
    } else {
        start = Date.UTC(parts.year, parts.month - 1, 1)
    }

    return { start: formatWallClockDate(new Date(start)), end }
}

export function formatWallClockDate(date: Date) {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}T00:00`
}

export function getLocalDateParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) }
}

export function formatDisplayTime(value: string, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
    }).format(new Date(value))
}

export function parseDateTimeLocal(value: string, timeZone: string) {
    const [datePart, timePart] = value.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute)
    const firstGuess = new Date(wallClockAsUtc)
    const offset = getTimeZoneOffset(firstGuess, timeZone)
    return new Date(wallClockAsUtc - offset).toISOString()
}

export function getTimeZoneOffset(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return (
        Date.UTC(
            Number(values.year),
            Number(values.month) - 1,
            Number(values.day),
            Number(values.hour),
            Number(values.minute),
            Number(values.second),
        ) - date.getTime()
    )
}
export function getMetricLabel(metric: MetricKey, t: (key: string) => string) {
    const labels: Record<MetricKey, string> = {
        voltage: 'historyData.voltage',
        activePower: 'historyData.activePower',
        avgCurrent: 'historyData.averageCurrent',
        l1: 'historyData.l1Current',
        l2: 'historyData.l2Current',
        l3: 'historyData.l3Current',
    }
    return t(labels[metric])
}
export function transformPhaseMode(phaseMode: PhaseMode) {
    switch (phaseMode) {
        case 'single_phase':
            return '1P'
        case 'three_phase':
            return '3P'
        case 'three_phase_balanced':
            return '3P-Bal'
        default:
            return ''
    }
}
export function getAverageCurrent(
    data: { l1?: number | null; l2?: number | null; l3?: number | null } | undefined,
    
    phaseMode: PhaseMode,
): number | null {
    if (!data) return null
    if (phaseMode === 'single_phase' || phaseMode === 'three_phase_balanced') {
        return data.l1 ?? null
    }
    const { l1, l2, l3 } = data
    if (l1 == null || l2 == null || l3 == null) return null
    return (l1 + l2 + l3) / 3
}
export function getMeterStatus(meter: Pick<Meter, 'enabled' | 'isOnline'>): MeterStatus {
    if (!meter.enabled) return 'disabled'
    return meter.isOnline ? 'online' : 'offline'
}
export function getGatewayStatus(gateway: Pick<Gateway, 'enabled' | 'isOnline' | 'isVirtual'>): StatusDotState {
    if (!gateway.enabled) return 'disabled'
    return (gateway.isOnline ?? gateway.isVirtual) ? 'online' : 'offline'
}
export function normalizeCurrents<T extends { l1: number | null; l2: number | null; l3: number | null }>(
    row: T,
    phaseMode: string,
): T {
    if (phaseMode !== 'three_phase_balanced') return row
    return { ...row, l2: row.l1, l3: row.l1 }
}
