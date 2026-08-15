import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ActivePowerPoint } from '@/types/overview'

type MeterSparklineProps = {
    points: ActivePowerPoint[]
    loading: boolean
    rangeEnd: number
}

type SparklinePoint = ActivePowerPoint & {
    bucketTs: number
}

const MINUTE_MS = 60 * 1000
const RANGE_MS = 24 * 60 * MINUTE_MS

function formatBucketTime(bucket: string) {
    const match = bucket.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!match) return bucket
    const [, , , , hour, minute] = match
    return `${hour}:${minute}`
}

export function MeterSparkline({ points, loading, rangeEnd }: MeterSparklineProps) {
    const rangeStart = rangeEnd - RANGE_MS
    const actualPoints = points
        .filter((point): point is ActivePowerPoint & { activePower: number } => point.activePower != null)
        .map((point) => ({ ...point, bucketTs: Date.parse(point.bucket) }))
        .filter((point) => !Number.isNaN(point.bucketTs) && point.bucketTs >= rangeStart && point.bucketTs <= rangeEnd)
        .sort((a, b) => a.bucketTs - b.bucketTs)
    const maxPower = actualPoints.reduce((max, point) => Math.max(max, point.activePower), 0)
    const hasNegativePower = actualPoints.some((point) => point.activePower < 0)
    const yDomain: [number | string, number | string] = hasNegativePower
        ? ['dataMin', 'dataMax']
        : [0, maxPower > 0 ? maxPower * 1.1 : 1]

    const data: SparklinePoint[] = []
    for (const point of actualPoints) {
        const previous = data.at(-1)
        if (previous?.activePower != null && point.bucketTs - previous.bucketTs > MINUTE_MS) {
            const gapTs = previous.bucketTs + MINUTE_MS
            data.push({ bucket: new Date(gapTs).toISOString(), bucketTs: gapTs, activePower: null })
        }
        data.push(point)
    }
    const bucketLabels = new Map(data.map((point) => [point.bucketTs, formatBucketTime(point.bucket)]))

    if (loading && actualPoints.length === 0) {
        return <div className='h-12 animate-pulse rounded bg-[#F1F2EF]' aria-label='Loading' />
    }
    if (actualPoints.length === 0) return <div className='flex h-12 items-center text-sm text-[#AAB2AD]'>—</div>

    return (
        <div className='h-12 w-full' role='img' aria-label='Active power trend'>
            <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data} margin={{ top: 5, right: 3, bottom: 3, left: 3 }}>
                    <XAxis
                        dataKey='bucketTs'
                        type='number'
                        domain={[rangeStart, rangeEnd]}
                        allowDataOverflow
                        hide
                    />
                    <YAxis dataKey='activePower' domain={yDomain} hide />
                    <Tooltip
                        labelFormatter={(label) => bucketLabels.get(Number(label)) ?? ''}
                        formatter={(value) => [`${Number(value).toFixed(2)} kW`, '']}
                        separator=''
                        cursor={{ stroke: '#BFC8C2', strokeWidth: 1 }}
                        contentStyle={{
                            border: '1px solid #D8DDD9',
                            borderRadius: 0,
                            padding: '6px 8px',
                            fontSize: 12,
                        }}
                    />
                    <Line
                        type='monotone'
                        dataKey='activePower'
                        stroke='#438466'
                        strokeWidth={2}
                        dot={actualPoints.length === 1}
                        activeDot={{ r: 3 }}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
