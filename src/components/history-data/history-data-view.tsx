'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getGatewayDisplayName } from '@/lib/gateway'
import { mapErrorKey, useI18n } from '@/lib/i18n'
import { fillTimeseriesBuckets } from '@/lib/timeseries'
import { ApiError } from '@/lib/api/client'
import { useTimeseries } from '@/lib/api/timeseries'
import { useSettings } from '@/lib/api/settings.queries'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import type { TimeseriesAxis } from '@/types/timeseries'
import {
    formatDisplayTime,
    getAverageCurrent,
    getDefaultRange,
    getMetricLabel,
    getYDomain,
    normalizeCurrents,
    parseDateTimeLocal,
} from '@/lib/utils'
import { MetricCheckboxes } from './metric-check-boxes'
import { MetricCheckbox } from './metric-checkbox'
import { Field } from '../ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

type Props = { gateways: Gateway[]; meters: Meter[] }
export type MetricKey = 'voltage' | 'activePower' | 'avgCurrent' | 'l1' | 'l2' | 'l3'
export type SelectedMetrics = Record<MetricKey, boolean>
type CurrentColumnKey = 'l1' | 'l2' | 'l3'

export const metricColors: Record<MetricKey, string> = {
    voltage: '#2F6F95',
    activePower: '#C46A3A',
    avgCurrent: '#4E8B74',
    l1: '#8B5E9E',
    l2: '#B38A2E',
    l3: '#B54E45',
}

const initialSelectedMetrics: SelectedMetrics = {
    voltage: false,
    activePower: true,
    avgCurrent: false,
    l1: false,
    l2: false,
    l3: false,
}
const DEFAULT_TIME_ZONE = 'Asia/Taipei'
const MAX_MINUTE_BUCKETS = 1500

const currentColumnLabelKeys: Record<CurrentColumnKey, string> = {
    l1: 'l1Current',
    l2: 'l2Current',
    l3: 'l3Current',
}

function formatAxisTick(bucket: string, timeZone: string, axis: TimeseriesAxis) {
    const date = new Date(bucket)
    const opts: Intl.DateTimeFormatOptions = { timeZone, hour12: false }
    switch (axis) {
        case 'minute':
            opts.hour = '2-digit'
            opts.minute = '2-digit'
            break
        case 'hour':
            opts.month = 'numeric'
            opts.day = 'numeric'
            opts.hour = '2-digit'
            break
        case 'day':
            opts.month = 'numeric'
            opts.day = 'numeric'
            break
        case 'month':
            opts.year = 'numeric'
            opts.month = 'numeric'
            break
    }
    return new Intl.DateTimeFormat('zh-TW', opts).format(date)
}

function formatYTick(value: number | string) {
    return typeof value === 'number' ? value.toFixed(2) : value
}

function shiftDateTime(value: string, axis: TimeseriesAxis, amount: number, timeZone: string) {
    const date = new Date(parseDateTimeLocal(value, timeZone))
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
    const wallClock = new Date(Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute))

    if (axis === 'minute') wallClock.setUTCHours(wallClock.getUTCHours() + amount)
    if (axis === 'hour') wallClock.setUTCDate(wallClock.getUTCDate() + amount * 7)
    if (axis === 'day') {
        const targetMonth = wallClock.getUTCMonth() + amount
        const targetYear = wallClock.getUTCFullYear() + Math.floor(targetMonth / 12)
        const normalizedMonth = ((targetMonth % 12) + 12) % 12
        const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
        wallClock.setUTCFullYear(targetYear, normalizedMonth, Math.min(wallClock.getUTCDate(), lastDay))
    }
    if (axis === 'month') {
        const targetYear = wallClock.getUTCFullYear() + amount
        const lastDay = new Date(Date.UTC(targetYear, wallClock.getUTCMonth() + 1, 0)).getUTCDate()
        wallClock.setUTCFullYear(targetYear, wallClock.getUTCMonth(), Math.min(wallClock.getUTCDate(), lastDay))
    }

    const pad = (part: number) => String(part).padStart(2, '0')
    return `${wallClock.getUTCFullYear()}-${pad(wallClock.getUTCMonth() + 1)}-${pad(wallClock.getUTCDate())}T${pad(wallClock.getUTCHours())}:${pad(wallClock.getUTCMinutes())}`
}

function displayNumericValue(value: number | null | undefined, decimals = false) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
    return decimals ? value.toFixed(2) : value
}

export function HistoryDataView({ gateways, meters }: Props) {
    const { t } = useI18n()
    const settingsQuery = useSettings()
    const timeZone = settingsQuery.data?.appConfig.timeZone ?? DEFAULT_TIME_ZONE
    const [axis, setAxis] = useState<TimeseriesAxis>('minute')
    const initialRange = getDefaultRange('minute', DEFAULT_TIME_ZONE)
    const [date, setDate] = useState(initialRange.start)
    const [endDate, setEndDate] = useState(initialRange.end)
    const [gatewayId, setGatewayId] = useState(gateways[0]?.id ?? 0)
    const [meterId, setMeterId] = useState(meters[0]?.macId ?? '')
    const [selectedMetrics, setSelectedMetrics] = useState<SelectedMetrics>(initialSelectedMetrics)
    const [submitted, setSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const previousAxis = useRef<TimeseriesAxis | null>(null)

    useEffect(() => {
        if (previousAxis.current === null) {
            previousAxis.current = axis
            return
        }
        if (previousAxis.current === axis) return
        previousAxis.current = axis
        const range = getDefaultRange(axis, timeZone)
        setDate(range.start)
        setEndDate(range.end)
    }, [axis, timeZone])

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayId || meter.gatewayId === gatewayId),
        [gatewayId, meters],
    )
    const selectedMeter = meters.find((meter) => meter.macId === meterId)
    const phaseMode = selectedMeter?.phaseMode ?? 'single_phase'
    const isThreePhaseUnbalanced = phaseMode === 'three_phase'

    function resetCurrentMetrics() {
        setSelectedMetrics((current) => ({
            ...current,
            avgCurrent: false,
            l1: false,
            l2: false,
            l3: false,
        }))
    }

    function handleGatewayChange(value: string) {
        const id = Number(value)
        setGatewayId(id)
        const nextMeter = meters.find((meter) => meter.gatewayId === id)
        setMeterId(nextMeter?.macId ?? '')
        resetCurrentMetrics()
        setSubmitted(false)
    }

    function handleMeterChange(value: string) {
        setMeterId(value)
        resetCurrentMetrics()
        setSubmitted(false)
    }

    function handleAxisChange(value: TimeseriesAxis) {
        setAxis(value)
        setSubmitted(false)
    }

    function validateQueryRange() {
        if (date && endDate && date >= endDate) {
            setSubmitted(false)
            toast.error(t('historyData.endMustBeAfterStart'))
            return false
        }
        if (axis !== 'minute') return true
        const start = Date.parse(parseDateTimeLocal(date, timeZone))
        const end = Date.parse(parseDateTimeLocal(endDate, timeZone))
        if (!Number.isFinite(start) || !Number.isFinite(end)) return true
        const buckets = Math.ceil((end - start) / (60 * 1000))
        if (buckets > MAX_MINUTE_BUCKETS) {
            setSubmitted(false)
            toast.error(t('historyData.minuteRangeTooLong', { max: MAX_MINUTE_BUCKETS }))
            return false
        }
        return true
    }

    function submitQuery() {
        if (!validateQueryRange()) {
            setIsSubmitting(false)
            return
        }
        setIsSubmitting(true)
        if (submitted) {
            void query.refetch()
            return
        }
        setSubmitted(true)
    }

    function handleRefresh() {
        const range = getDefaultRange(axis, timeZone)
        setSubmitted(false)
        setDate(range.start)
        setEndDate(range.end)
        setIsSubmitting(false)
    }

    function shiftRange(direction: -1 | 1) {
        const nextStart = direction === -1 ? shiftDateTime(date, axis, -1, timeZone) : endDate
        const nextEnd = direction === -1 ? date : shiftDateTime(endDate, axis, 1, timeZone)
        setDate(nextStart)
        setEndDate(nextEnd)
        setSubmitted(false)
        setIsSubmitting(false)
    }

    function toggleMetric(metric: MetricKey, checked: boolean) {
        setSelectedMetrics((current) => ({ ...current, [metric]: checked }))
    }

    const params = {
        gatewayId,
        meterId,
        axis,
        start: parseDateTimeLocal(date, timeZone),
        end: parseDateTimeLocal(endDate, timeZone),
    }
    const query = useTimeseries(params, submitted && Boolean(gatewayId && meterId))
    const queryErrorMessage = query.error instanceof ApiError ? query.error.message : ''
    useEffect(() => {
        if (queryErrorMessage) {
            toast.error(t(mapErrorKey(queryErrorMessage)))
            setIsSubmitting(false)
        }
    }, [queryErrorMessage])
    useEffect(() => {
        if (submitted && !query.isFetching) setIsSubmitting(false)
    }, [query.isFetching, submitted])
    const rows = query.data ?? []
    const tableRows = useMemo(
        () =>
            submitted && query.isSuccess && !query.isFetching
                ? fillTimeseriesBuckets(rows, axis, date, endDate, timeZone, phaseMode)
                : [],
        [axis, date, endDate, phaseMode, query.isFetching, query.isSuccess, rows, submitted, timeZone],
    )
    const sortedRows = useMemo(() => [...tableRows].sort((a, b) => b.bucketTs - a.bucketTs), [tableRows])
    const visibleMetrics = (Object.keys(selectedMetrics) as MetricKey[]).filter((metric) => selectedMetrics[metric])
    const chartData = tableRows.map((row) => ({
        time: formatAxisTick(row.bucket, timeZone, axis),
        voltage: row.voltage,
        activePower: row.activePower,
        avgCurrent: getAverageCurrent(row, phaseMode),
        l1: row.l1,
        l2: row.l2,
        l3: row.l3,
    }))
    const yDomain = useMemo(() => getYDomain(chartData, visibleMetrics), [chartData, visibleMetrics])

    const metricOptions: { key: MetricKey; label: string }[] = [
        { key: 'voltage', label: t('historyData.voltage') },
        { key: 'activePower', label: t('historyData.activePower') },
    ]
    const currentOptions: { key: MetricKey; label: string }[] = isThreePhaseUnbalanced
        ? [
              { key: 'avgCurrent', label: t('historyData.averageCurrent') },
              { key: 'l1', label: t('historyData.l1Current') },
              { key: 'l2', label: t('historyData.l2Current') },
              { key: 'l3', label: t('historyData.l3Current') },
          ]
        : [{ key: 'avgCurrent', label: t('historyData.current') }]

    const threePhaseColumns: CurrentColumnKey[] = ['l1', 'l2', 'l3']

    const tableHeaders = [
        'time',
        'gateway',
        'meter',
        'voltage',
        'averageCurrent',
        ...(isThreePhaseUnbalanced ? threePhaseColumns.map((metric) => currentColumnLabelKeys[metric]) : []),
        'activePower',
        'status',
    ]
    const axisLabels: Record<TimeseriesAxis, string> = {
        minute: t('historyData.minute'),
        hour: t('historyData.hour'),
        day: t('historyData.day'),
        month: t('historyData.month'),
    }
    return (
        <div className='flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-4'>
            <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between bg-[#F7F5F0]'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('historyData.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {sortedRows.length} {t('historyData.records')}
                </span>
            </div>

            <section className='shrink-0 border border-[#D8DDD9] bg-white p-3'>
                <div className='grid gap-2 xl:grid-cols-[1.2fr_1.2fr_0.7fr_1.5fr_1.5fr_0.9fr]'>
                    <Field label={t('historyData.gateway')}>
                        <Select
                            value={gatewayId ? String(gatewayId) : undefined}
                            onValueChange={(value) => {
                                if (value) handleGatewayChange(value)
                            }}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder={t('historyData.selectGateway')}>
                                    {() => {
                                        const gateway = gateways.find((g) => g.id === gatewayId)
                                        return gateway
                                            ? getGatewayDisplayName(gateway, t)
                                            : t('historyData.selectGateway')
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {gateways.map((gateway) => (
                                    <SelectItem key={gateway.id} value={String(gateway.id)}>
                                        {getGatewayDisplayName(gateway, t)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={t('historyData.meter')}>
                        <Select
                            value={meterId || undefined}
                            onValueChange={(value) => {
                                if (value) handleMeterChange(value)
                            }}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder={t('historyData.selectMeter')}>
                                    {() => {
                                        const meter = availableMeters.find((m) => m.macId === meterId)
                                        return meter ? meter.name || meter.macId : t('historyData.selectMeter')
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {availableMeters.map((meter) => (
                                    <SelectItem key={meter.macId} value={meter.macId}>
                                        {meter.name || meter.macId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={t('historyData.timeRange')}>
                        <Select
                            value={axis}
                            onValueChange={(value) => {
                                if (value) handleAxisChange(value as TimeseriesAxis)
                            }}>
                            <SelectTrigger className='w-full'>
                                <SelectValue>{() => axisLabels[axis]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value='minute'>{t('historyData.minute')}</SelectItem>
                                    <SelectItem value='hour'>{t('historyData.hour')}</SelectItem>
                                    <SelectItem value='day'>{t('historyData.day')}</SelectItem>
                                    <SelectItem value='month'>{t('historyData.month')}</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={t('historyData.startTime')}>
                        <input
                            type='datetime-local'
                            value={date}
                            max={endDate || undefined}
                            onChange={(event) => {
                                const value = event.target.value
                                if (endDate && value >= endDate) {
                                    toast.error(t('historyData.endMustBeAfterStart'))
                                    return
                                }
                                setDate(value)
                                setSubmitted(false)
                            }}
                            className='control-input min-w-[15rem] w-full'
                        />
                    </Field>
                    <Field label={t('historyData.endTime')}>
                        <div className='flex min-w-0 flex-col gap-2'>
                            <input
                                type='datetime-local'
                                value={endDate}
                                min={date || undefined}
                                onChange={(event) => {
                                    const value = event.target.value
                                    if (date && value <= date) {
                                        toast.error(t('historyData.endMustBeAfterStart'))
                                        return
                                    }
                                    setEndDate(value)
                                    setSubmitted(false)
                                }}
                            className='control-input min-w-0 w-full'
                            />
                            <div className='flex w-full flex-nowrap items-center justify-end gap-1 overflow-x-auto'>
                                <button
                                    type='button'
                                    onClick={() => shiftRange(-1)}
                                    disabled={isSubmitting || query.isFetching}
                                    aria-label={t('historyData.previousRange')}
                                    title={t('historyData.previousRange')}
                                    className='inline-flex h-8 w-7 shrink-0 items-center justify-center border border-[#BFC8C2] text-[#153F31] hover:bg-[#F1F2EF] disabled:opacity-60'>
                                    <ChevronLeft className='h-4 w-4' />
                                </button>
                                <button
                                    type='button'
                                    onClick={handleRefresh}
                                    disabled={isSubmitting || query.isFetching}
                                    aria-label={t('historyData.resetTimeDefault')}
                                    title={t('historyData.resetTimeDefault')}
                                    className='inline-flex h-8 w-7 shrink-0 items-center justify-center border border-[#BFC8C2] text-[#153F31] hover:bg-[#F1F2EF] disabled:opacity-60'>
                                    <RefreshCw className={`h-4 w-4 ${isSubmitting || query.isFetching ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => shiftRange(1)}
                                    disabled={isSubmitting || query.isFetching}
                                    aria-label={t('historyData.nextRange')}
                                    title={t('historyData.nextRange')}
                                    className='inline-flex h-8 w-7 shrink-0 items-center justify-center border border-[#BFC8C2] text-[#153F31] hover:bg-[#F1F2EF] disabled:opacity-60'>
                                    <ChevronRight className='h-4 w-4' />
                                </button>
                                <button
                                    type='button'
                                    onClick={submitQuery}
                                    disabled={isSubmitting || query.isFetching}
                                    className='h-8 w-24 shrink-0 bg-[#153F31] px-1 text-xs font-medium text-white hover:bg-[#1B503D] disabled:opacity-60'>
                                    {isSubmitting || query.isFetching ? t('historyData.loading') : t('historyData.query')}
                                </button>
                            </div>
                        </div>
                    </Field>
                </div>

                <div className='mt-4 flex flex-wrap items-start gap-x-7 gap-y-3'>
                    <div className='flex flex-wrap items-start gap-x-7 gap-y-3'>
                        <MetricCheckboxes options={metricOptions} selected={selectedMetrics} onChange={toggleMetric} />
                        {isThreePhaseUnbalanced ? (
                            <fieldset className='flex flex-wrap items-center gap-x-4 gap-y-2'>
                                <legend className='mr-1 text-sm font-medium text-[#4F5A54]'>
                                    {t('historyData.currentGroup')}
                                </legend>
                                {currentOptions.map((option) => (
                                    <MetricCheckbox
                                        key={option.key}
                                        option={option}
                                        selected={selectedMetrics}
                                        onChange={toggleMetric}
                                    />
                                ))}
                            </fieldset>
                        ) : (
                            currentOptions.map((option) => (
                                <MetricCheckbox
                                    key={option.key}
                                    option={option}
                                    selected={selectedMetrics}
                                    onChange={toggleMetric}
                                />
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className='shrink-0 border border-[#D8DDD9] bg-white p-4'>
                <div className='flex items-center justify-between'>
                    <h2 className='text-xl font-bold'>{t('historyData.chartTitle')}</h2>
                    <span className='text-sm text-[#7B8580]'>
                        {rows.length} {t('historyData.samples')}
                    </span>
                </div>
                <div className={`relative h-[27rem] w-full transition-opacity ${query.isFetching ? 'opacity-60' : ''}`}>
                    {query.isFetching && (
                        <div
                            className='absolute inset-0 z-10 flex items-center justify-center bg-white/40'
                            role='status'
                            aria-live='polite'>
                            <span className='rounded border border-[#D8DDD9] bg-white px-4 py-2 text-sm text-[#5F6964]'>
                                {t('historyData.loading')}
                            </span>
                        </div>
                    )}
                    <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={chartData} margin={{ top: 20, right: 18, left: 18, bottom: 8 }}>
                            <CartesianGrid stroke='#E5E9E6' vertical />
                            <XAxis
                                dataKey='time'
                                tick={{ fill: '#7B8580', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={24}
                            />
                            <YAxis
                                domain={yDomain}
                                tickFormatter={formatYTick}
                                tick={{ fill: '#7B8580', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip />
                            <Legend />
                            {visibleMetrics.map((metric) => (
                                <Line
                                    key={metric}
                                    type='monotone'
                                    name={getMetricLabel(metric, t)}
                                    dataKey={metric}
                                    stroke={metricColors[metric]}
                                    dot={false}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <section className='shrink-0 overflow-x-auto border border-[#D8DDD9] bg-white'>
                <table className='w-full min-w-[980px] text-sm'>
                    <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'>
                        <tr>
                            {tableHeaders.map((key) => (
                                <th key={key} className='whitespace-nowrap px-4 py-3 font-medium'>
                                    {t(`historyData.${key}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={tableHeaders.length}
                                    className='px-2 py-4 text-center text-muted-foreground'>
                                    {t('historyData.noData')}
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row) => (
                                <tr key={row.bucketTs} className='border-t border-[#E1E5E2]'>
                                    <td className='p-2'>{formatDisplayTime(row.bucket, timeZone)}</td>
                                    <td className='p-2'>
                                        {getGatewayDisplayName(gateways.find((g) => g.id === gatewayId)!, t)}
                                    </td>
                                    <td className='p-2'>{selectedMeter?.name || meterId}</td>
                                    <td className='p-2'>{displayNumericValue(row.voltage)}</td>
                                    <td className='p-2'>{displayNumericValue(getAverageCurrent(row, phaseMode), true)}</td>
                                    {isThreePhaseUnbalanced &&
                                        threePhaseColumns.map((metric) => (
                                            <td key={metric} className='p-2'>
                                                {displayNumericValue(row[metric])}
                                            </td>
                                        ))}
                                    <td className='p-2'>{displayNumericValue(row.activePower)}</td>
                                    <td className='p-2'>
                                        {row.sampleCount ? t('historyData.online') : t('historyData.offline')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}
