import type { PhaseMode } from './meter'

export type TimeseriesAxis = 'minute' | 'hour' | 'day' | 'month'

export type TimeseriesPoint = {
    bucketTs: number
    bucket: string
    sampleCount: number
    phaseMode: PhaseMode
    voltage: number | null
    powerFactor: number | null
    activePower: number | null
    avgCurrent: number | null
    l1: number | null
    l2: number | null
    l3: number | null
}
