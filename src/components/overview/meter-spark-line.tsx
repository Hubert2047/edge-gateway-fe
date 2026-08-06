import { ActivePowerPoint } from '@/types/overview'

export function MeterSparkline({ points, loading }: { points: ActivePowerPoint[]; loading: boolean }) {
    const values = points.flatMap((point) => (point.activePower == null ? [] : [point.activePower]))
    if (loading && values.length === 0) {
        return <div className='h-8 animate-pulse rounded bg-[#F1F2EF]' aria-label='Loading' />
    }
    if (values.length === 0) return <div className='flex h-8 items-center text-sm text-[#AAB2AD]'>—</div>

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const polyline = values
        .map((value, index) => {
            const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
            const y = 30 - ((value - min) / range) * 26
            return `${x},${y}`
        })
        .join(' ')

    return (
        <svg
            viewBox='0 0 100 32'
            preserveAspectRatio='none'
            className='h-8 w-full text-[#438466]'
            role='img'
            aria-label='Active power trend'>
            <polyline
                points={polyline}
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                vectorEffect='non-scaling-stroke'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    )
}
