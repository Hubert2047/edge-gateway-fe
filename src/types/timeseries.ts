export type TimeseriesAxis = 'minute' | 'hour' | 'day' | 'month'

export type TimeseriesPoint = {
    bucketTs: number
    bucket: string
    sampleCount: number
    voltage: number | null
    powerFactor: number | null
    activePower: number | null
    avgCurrent: number | null
    ch1Current: number | null
    ch2Current: number | null
    ch3Current: number | null
}
