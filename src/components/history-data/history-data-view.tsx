'use client'
import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getGatewayDisplayName } from '@/lib/gateway'
import { mapErrorKey, useI18n } from '@/lib/i18n'
import { ApiError } from '@/lib/api/client'
import { useTimeseries } from '@/lib/api/timeseries'
import { useSettings } from '@/lib/api/settings.queries'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import type { TimeseriesAxis } from '@/types/timeseries'
import {
    formatDisplayTime,
    formatValue,
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

export function HistoryDataView({ gateways, meters }: Props) {
    const { t } = useI18n()
    const settingsQuery = useSettings()
    const timeZone = settingsQuery.data?.appConfig.timeZone ?? DEFAULT_TIME_ZONE
    const [axis, setAxis] = useState<TimeseriesAxis>('minute')
    const initialRange = getDefaultRange('minute', DEFAULT_TIME_ZONE)
    const [date, setDate] = useState(initialRange.start)
    const [endDate, setEndDate] = useState(initialRange.end)
    const [gatewayUid, setGatewayUid] = useState(gateways[0]?.uid ?? '')
    const [meterId, setMeterId] = useState(meters[0]?.macId ?? '')
    const [selectedMetrics, setSelectedMetrics] = useState<SelectedMetrics>(initialSelectedMetrics)
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        if (!settingsQuery.data) return
        const range = getDefaultRange(axis, timeZone)
        setDate(range.start)
        setEndDate(range.end)
    }, [axis, settingsQuery.data, timeZone])

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )
    const selectedMeter = meters.find((meter) => meter.macId === meterId)
    const phaseMode = selectedMeter?.phaseMode ?? 'single_phase'
    const isThreePhase = phaseMode === 'three_phase' || phaseMode === 'three_phase_balanced'

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
        setGatewayUid(value)
        const nextMeter = meters.find((meter) => meter.gatewayUID === value)
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
        const range = getDefaultRange(value, timeZone)
        setDate(range.start)
        setEndDate(range.end)
        setSubmitted(false)
    }

    function toggleMetric(metric: MetricKey, checked: boolean) {
        setSelectedMetrics((current) => ({ ...current, [metric]: checked }))
    }

    const params = {
        gatewayUid,
        meterId,
        axis,
        start: parseDateTimeLocal(date, timeZone),
        end: parseDateTimeLocal(endDate, timeZone),
    }
    const query = useTimeseries(params, submitted && Boolean(gatewayUid && meterId))
    const rows = query.data ?? []
    const normalizedRows = useMemo(() => rows.map((row) => normalizeCurrents(row, phaseMode)), [rows, phaseMode])
    const sortedRows = useMemo(() => [...normalizedRows].sort((a, b) => b.bucketTs - a.bucketTs), [normalizedRows])
    const visibleMetrics = (Object.keys(selectedMetrics) as MetricKey[]).filter((metric) => selectedMetrics[metric])
    const chartData = normalizedRows.map((row) => ({
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
    const currentOptions: { key: MetricKey; label: string }[] = isThreePhase
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
        ...(isThreePhase ? threePhaseColumns.map((metric) => currentColumnLabelKeys[metric]) : []),
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
                    {rows.length} {t('historyData.records')}
                </span>
            </div>

            <section className='shrink-0 border border-[#D8DDD9] bg-white p-4'>
                <div className='grid gap-3 xl:grid-cols-6'>
                    <Field label={t('historyData.gateway')}>
                        <Select
                            value={gatewayUid || undefined}
                            onValueChange={(value) => {
                                if (value) handleGatewayChange(value)
                            }}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder={t('historyData.selectGateway')}>
                                    {() => {
                                        const gateway = gateways.find((g) => g.uid === gatewayUid)
                                        return gateway
                                            ? getGatewayDisplayName(gateway, t)
                                            : t('historyData.selectGateway')
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {gateways.map((gateway) => (
                                    <SelectItem key={gateway.uid} value={gateway.uid}>
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
                            onChange={(event) => {
                                setDate(event.target.value)
                                setSubmitted(false)
                            }}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('historyData.endTime')}>
                        <input
                            type='datetime-local'
                            value={endDate}
                            onChange={(event) => {
                                setEndDate(event.target.value)
                                setSubmitted(false)
                            }}
                            className='control-input'
                        />
                    </Field>
                    <div className='flex justify-center items-center mt-6'>
                        <button
                            type='button'
                            onClick={() => setSubmitted(true)}
                            disabled={query.isFetching}
                            className='h-8 w-32 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D]  disabled:opacity-60'>
                            {query.isFetching ? t('historyData.loading') : t('historyData.query')}
                        </button>
                    </div>
                </div>

                <div className='mt-4 flex flex-wrap items-start gap-x-7 gap-y-3'>
                    <div className='flex flex-wrap items-start gap-x-7 gap-y-3'>
                        <MetricCheckboxes options={metricOptions} selected={selectedMetrics} onChange={toggleMetric} />
                        {isThreePhase ? (
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
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {query.error instanceof ApiError && (
                    <p className='mt-4 text-center text-sm text-[#B54E45]'>{t(mapErrorKey(query.error.message))}</p>
                )}
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
                                        {getGatewayDisplayName(gateways.find((g) => g.uid === gatewayUid)!, t)}
                                    </td>
                                    <td className='p-2'>{meterId}</td>
                                    <td className='p-2'>{row.voltage ?? '—'}</td>
                                    <td className='p-2'>{formatValue(getAverageCurrent(row, phaseMode))}</td>
                                    {isThreePhase &&
                                        threePhaseColumns.map((metric) => (
                                            <td key={metric} className='p-2'>
                                                {row[metric] ?? '—'}
                                            </td>
                                        ))}
                                    <td className='p-2'>{row.activePower ?? '—'}</td>
                                    <td className='p-2'>{row.sampleCount ? t('historyData.ok') : '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}
