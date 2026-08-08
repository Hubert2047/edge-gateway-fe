'use client'
import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import { ApiError } from '@/lib/api/client'
import { useTimeseries } from '@/lib/api/timeseries'
import { useSettings } from '@/lib/api/settings.queries'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import type { TimeseriesAxis } from '@/types/timeseries'
import { formatDisplayTime, getDefaultRange, getMetricLabel, getYDomain, parseDateTimeLocal } from '@/lib/utils'
import { MetricCheckboxes } from './metric-check-boxes'
import { MetricCheckbox } from './metric-checkbox'
import { Field } from '../ui/field'

type Props = { gateways: Gateway[]; meters: Meter[] }
export type MetricKey = 'voltage' | 'activePower' | 'avgCurrent' | 'ch1Current' | 'ch2Current' | 'ch3Current'
export type SelectedMetrics = Record<MetricKey, boolean>
type CurrentColumnKey = 'ch1Current' | 'ch2Current' | 'ch3Current'

export const metricColors: Record<MetricKey, string> = {
    voltage: '#2F6F95',
    activePower: '#C46A3A',
    avgCurrent: '#4E8B74',
    ch1Current: '#8B5E9E',
    ch2Current: '#B38A2E',
    ch3Current: '#B54E45',
}

const initialSelectedMetrics: SelectedMetrics = {
    voltage: false,
    activePower: true,
    avgCurrent: false,
    ch1Current: false,
    ch2Current: false,
    ch3Current: false,
}
const DEFAULT_TIME_ZONE = 'Asia/Taipei'

const currentColumnLabelKeys: Record<CurrentColumnKey, string> = {
    ch1Current: 'l1Current',
    ch2Current: 'l2Current',
    ch3Current: 'l3Current',
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDate(range.start)
        setEndDate(range.end)
    }, [axis, settingsQuery.data, timeZone])

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )
    const selectedMeter = meters.find((meter) => meter.macId === meterId)
    const isThreePhase =
        selectedMeter?.phaseMode === 'three_phase' || selectedMeter?.phaseMode === 'three_phase_balanced'

    function resetCurrentMetrics() {
        setSelectedMetrics((current) => ({
            ...current,
            avgCurrent: false,
            ch1Current: false,
            ch2Current: false,
            ch3Current: false,
        }))
    }

    function handleGatewayChange(value: string) {
        setGatewayUid(value)
        const nextMeter = meters.find((meter) => meter.gatewayUID === value)
        setMeterId(nextMeter?.macId ?? '')
        resetCurrentMetrics()
    }

    function handleMeterChange(value: string) {
        setMeterId(value)
        resetCurrentMetrics()
    }

    function toggleMetric(metric: MetricKey, checked: boolean) {
        setSelectedMetrics((current) => ({ ...current, [metric]: checked }))
    }

    function handleAxisChange(value: TimeseriesAxis) {
        setAxis(value)
        const range = getDefaultRange(value, timeZone)
        setDate(range.start)
        setEndDate(range.end)
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
    const sortedRows = useMemo(
        () => [...rows].sort((a, b) => b.bucketTs - a.bucketTs),
        [rows],
    )
    const visibleMetrics = (Object.keys(selectedMetrics) as MetricKey[]).filter((metric) => selectedMetrics[metric])
    const visibleCurrentColumns = (['ch1Current', 'ch2Current', 'ch3Current'] as CurrentColumnKey[]).filter(
        (metric) => selectedMetrics[metric],
    )
    const chartData = rows.map((row) => ({
        time: formatAxisTick(row.bucket, timeZone, axis),
        voltage: row.voltage,
        activePower: row.activePower,
        avgCurrent: row.avgCurrent,
        ch1Current: row.ch1Current,
        ch2Current: row.ch2Current,
        ch3Current: row.ch3Current,
    }))
    const yDomain = useMemo(() => getYDomain(chartData, visibleMetrics), [chartData, visibleMetrics])

    const metricOptions: { key: MetricKey; label: string }[] = [
        { key: 'voltage', label: t('historyData.voltage') },
        { key: 'activePower', label: t('historyData.activePower') },
    ]
    const currentOptions: { key: MetricKey; label: string }[] = isThreePhase
        ? [
            { key: 'avgCurrent', label: t('historyData.averageCurrent') },
            { key: 'ch1Current', label: t('historyData.l1Current') },
            { key: 'ch2Current', label: t('historyData.l2Current') },
            { key: 'ch3Current', label: t('historyData.l3Current') },
        ]
        : [{ key: 'avgCurrent', label: t('historyData.current') }]

    const tableHeaders = [
        'time',
        'gateway',
        'meter',
        'voltage',
        'averageCurrent',
        ...visibleCurrentColumns.map((metric) => currentColumnLabelKeys[metric]),
        'activePower',
        'status',
    ]

    return (
        <div className='flex h-full min-h-0 flex-col gap-7 overflow-y-auto pb-8'>
            <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#D8DDD9] bg-[#F7F5F0] pt-1 pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('historyData.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {rows.length} {t('historyData.records')}
                </span>
            </div>

            <section className='shrink-0 border border-[#D8DDD9] bg-white p-4'>
                <div className='grid gap-3 xl:grid-cols-5'>
                    <Field label={t('historyData.gateway')}>
                        <select
                            value={gatewayUid}
                            onChange={(event) => handleGatewayChange(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyData.selectGateway')}</option>
                            {gateways.map((gateway) => (
                                <option key={gateway.uid} value={gateway.uid}>
                                    {getGatewayDisplayName(gateway, t)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyData.meter')}>
                        <select
                            value={meterId}
                            onChange={(event) => handleMeterChange(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyData.selectMeter')}</option>
                            {availableMeters.map((meter) => (
                                <option key={meter.macId} value={meter.macId}>
                                    {meter.name || meter.macId}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyData.timeRange')}>
                        <select
                            value={axis}
                            onChange={(event) => handleAxisChange(event.target.value as TimeseriesAxis)}
                            className='control-input'>
                            <option value='minute'>{t('historyData.minute')}</option>
                            <option value='hour'>{t('historyData.hour')}</option>
                            <option value='day'>{t('historyData.day')}</option>
                            <option value='month'>{t('historyData.month')}</option>
                        </select>
                    </Field>
                    <Field label={t('historyData.startTime')}>
                        <input
                            type='datetime-local'
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('historyData.endTime')}>
                        <input
                            type='datetime-local'
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className='control-input'
                        />
                    </Field>
                </div>

                <div className='mt-4 flex flex-wrap items-start gap-x-7 gap-y-3'>
                    <MetricCheckboxes options={metricOptions} selected={selectedMetrics} onChange={toggleMetric} />
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
                    <button
                        type='button'
                        onClick={() => setSubmitted(true)}
                        disabled={query.isFetching}
                        className='h-8 w-32 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D] disabled:cursor-wait disabled:opacity-60'>
                        {query.isFetching ? t('historyData.loading') : t('historyData.query')}
                    </button>
                    {query.isFetching && (
                        <span role='status' className='self-center text-sm text-[#5F6964]'>
                            {t('historyData.loading')}
                        </span>
                    )}
                </div>
            </section>

            <section className='shrink-0 border border-[#D8DDD9] bg-white p-7'>
                <div className='mb-8 flex items-center justify-between'>
                    <h2 className='text-2xl font-bold'>{t('historyData.chartTitle')}</h2>
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
                    <p className='mt-4 text-center text-sm text-[#B54E45]'>{query.error.message}</p>
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
                                    className='px-4 py-8 text-center text-muted-foreground'>
                                    {t('historyData.noData')}
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row) => (
                                <tr key={row.bucketTs} className='border-t border-[#E1E5E2]'>
                                    <td className='px-4 py-3'>{formatDisplayTime(row.bucket, timeZone)}</td>
                                    <td className='px-4 py-3'>
                                        {getGatewayDisplayName(gateways.find((g) => g.uid === gatewayUid)!, t)}
                                    </td>
                                    <td className='px-4 py-3'>{meterId}</td>
                                    <td className='px-4 py-3'>{row.voltage ?? '—'}</td>
                                    <td className='px-4 py-3'>{row.avgCurrent ?? '—'}</td>
                                    {visibleCurrentColumns.map((metric) => (
                                        <td key={metric} className='px-4 py-3'>{row[metric] ?? '—'}</td>
                                    ))}
                                    <td className='px-4 py-3'>{row.activePower ?? '—'}</td>
                                    <td className='px-4 py-3'>{row.sampleCount ? t('historyData.ok') : '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}