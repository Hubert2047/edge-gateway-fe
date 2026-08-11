import type { PhaseMode } from '@/types/meter'
import type { TimeseriesAxis, TimeseriesPoint } from '@/types/timeseries'
import { formatWallClockDate, getLocalDateParts, parseDateTimeLocal } from '@/lib/utils'

function alignStart(value: string, axis: TimeseriesAxis) {
    const [datePart, timePart = '00:00'] = value.split('T')
    const [year, month] = datePart.split('-')
    const hour = timePart.slice(0, 2)

    switch (axis) {
        case 'minute':
            return `${datePart}T${timePart.slice(0, 5)}`
        case 'hour':
            return `${datePart}T${hour}:00`
        case 'day':
            return `${datePart}T00:00`
        case 'month':
            return `${year}-${month}-01T00:00`
    }
}

function nextBucket(bucketTs: number, axis: TimeseriesAxis, timeZone: string) {
    if (axis === 'minute') return bucketTs + 60 * 1000
    if (axis === 'hour') return bucketTs + 60 * 60 * 1000

    const parts = getLocalDateParts(new Date(bucketTs), timeZone)
    const nextLocalDate =
        axis === 'day'
            ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1))
            : new Date(Date.UTC(parts.year, parts.month, 1))
    return Date.parse(parseDateTimeLocal(formatWallClockDate(nextLocalDate), timeZone))
}

function emptyPoint(bucketTs: number, phaseMode: PhaseMode): TimeseriesPoint {
    return {
        bucketTs,
        bucket: new Date(bucketTs).toISOString(),
        sampleCount: 0,
        phaseMode,
        voltage: null,
        powerFactor: null,
        activePower: null,
        avgCurrent: null,
        l1: null,
        l2: null,
        l3: null,
    }
}

export function fillTimeseriesBuckets(
    points: TimeseriesPoint[],
    axis: TimeseriesAxis,
    start: string,
    end: string,
    timeZone: string,
    phaseMode: PhaseMode,
) {
    const pointByBucket = new Map(points.map((point) => [point.bucketTs, point]))
    const endTs = Date.parse(parseDateTimeLocal(end, timeZone))
    let bucketTs = Date.parse(parseDateTimeLocal(alignStart(start, axis), timeZone))
    const result: TimeseriesPoint[] = []

    while (bucketTs < endTs) {
        result.push(pointByBucket.get(bucketTs) ?? emptyPoint(bucketTs, phaseMode))
        bucketTs = nextBucket(bucketTs, axis, timeZone)
    }

    return result
}
