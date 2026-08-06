'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import { ApiError } from '@/lib/api/client'
import { useTimeseries } from '@/lib/api/timeseries'
import { useSettings } from '@/lib/api/settings.queries'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import type { TimeseriesAxis } from '@/types/timeseries'

type Props = { gateways: Gateway[]; meters: Meter[] }
type MetricKey = 'voltage' | 'activePower' | 'avgCurrent' | 'ch1Current' | 'ch2Current' | 'ch3Current'
type SelectedMetrics = Record<MetricKey, boolean>

const metricColors: Record<MetricKey, string> = {
    voltage: '#2F6F95',
    activePower: '#C46A3A',
    avgCurrent: '#4E8B74',
    ch1Current: '#8B5E9E',
    ch2Current: '#B38A2E',
    ch3Current: '#B54E45',
}

const initialSelectedMetrics: SelectedMetrics = {
    voltage: false,
    activePower: false,
    avgCurrent: true,
    ch1Current: false,
    ch2Current: false,
    ch3Current: false,
}
const DEFAULT_TIME_ZONE = 'Asia/Taipei'

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
        // The settings response establishes the backend timezone; align the initial fields once it arrives.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDate(range.start)
        setEndDate(range.end)
    }, [axis, settingsQuery.data, timeZone])

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )
    const selectedMeter = meters.find((meter) => meter.macId === meterId)
    const isThreePhase = selectedMeter?.phaseMode === 'three_phase' || selectedMeter?.phaseMode === 'three_phase_balanced'

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
    const visibleMetrics = (Object.keys(selectedMetrics) as MetricKey[]).filter((metric) => selectedMetrics[metric])
    const chartData = rows.map((row) => ({
        time: formatDisplayTime(row.bucket, timeZone),
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

    return (
        <div className='flex min-h-full flex-col gap-7 pb-8'>
            <div className='flex items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('historyData.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {rows.length} {t('historyData.records')}
                </span>
            </div>

            <section className='border border-[#D8DDD9] bg-white p-4'>
                <div className='grid gap-3 xl:grid-cols-5'>
                    <Field label={t('historyData.gateway')}>
                        <select value={gatewayUid} onChange={(event) => handleGatewayChange(event.target.value)} className='control-input'>
                            <option value=''>{t('historyData.selectGateway')}</option>
                            {gateways.map((gateway) => (
                                <option key={gateway.uid} value={gateway.uid}>{getGatewayDisplayName(gateway, t)}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyData.meter')}>
                        <select value={meterId} onChange={(event) => handleMeterChange(event.target.value)} className='control-input'>
                            <option value=''>{t('historyData.selectMeter')}</option>
                            {availableMeters.map((meter) => <option key={meter.macId} value={meter.macId}>{meter.name || meter.macId}</option>)}
                        </select>
                    </Field>
                    <Field label={t('historyData.timeRange')}>
                        <select value={axis} onChange={(event) => handleAxisChange(event.target.value as TimeseriesAxis)} className='control-input'>
                            <option value='minute'>Minute</option>
                            <option value='hour'>Hour</option>
                            <option value='day'>Day</option>
                            <option value='month'>Month</option>
                        </select>
                    </Field>
                    <Field label={t('historyData.startTime')}>
                        <input type='datetime-local' value={date} onChange={(event) => setDate(event.target.value)} className='control-input' />
                    </Field>
                    <Field label={t('historyData.endTime')}>
                        <input type='datetime-local' value={endDate} onChange={(event) => setEndDate(event.target.value)} className='control-input' />
                    </Field>
                </div>

                <div className='mt-4 flex flex-wrap items-start gap-x-7 gap-y-3'>
                    <MetricCheckboxes options={metricOptions} selected={selectedMetrics} onChange={toggleMetric} />
                    <fieldset className='flex flex-wrap items-center gap-x-4 gap-y-2'>
                        <legend className='mr-1 text-sm font-medium text-[#4F5A54]'>{t('historyData.currentGroup')}</legend>
                        {currentOptions.map((option) => (
                            <MetricCheckbox key={option.key} option={option} selected={selectedMetrics} onChange={toggleMetric} />
                        ))}
                    </fieldset>
                    <button type='button' onClick={() => setSubmitted(true)} className='h-8 w-32 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D]'>
                        {t('historyData.query')}
                    </button>
                </div>
            </section>

            <section className='border border-[#D8DDD9] bg-white p-7'>
                <div className='mb-8 flex items-center justify-between'>
                    <h2 className='text-2xl font-bold'>{t('historyData.chartTitle')}</h2>
                    <span className='text-sm text-[#7B8580]'>{rows.length} {t('historyData.samples')}</span>
                </div>
                <div className='h-[27rem] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={chartData} margin={{ top: 20, right: 18, left: 18, bottom: 8 }}>
                            <CartesianGrid stroke='#E5E9E6' vertical />
                            <XAxis dataKey='time' tick={{ fill: '#7B8580', fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis domain={yDomain} tick={{ fill: '#7B8580', fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Legend />
                            {visibleMetrics.map((metric) => (
                                <Line key={metric} type='monotone' name={getMetricLabel(metric, t)} dataKey={metric} stroke={metricColors[metric]} dot={false} connectNulls={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {query.error instanceof ApiError && <p className='mt-4 text-center text-sm text-[#B54E45]'>{query.error.message}</p>}
                {!query.error && rows.length === 0 && <p className='mt-4 text-center text-sm text-[#8A938E]'>{t('historyData.dataUnavailable')}</p>}
            </section>

            <section className='overflow-x-auto border border-[#D8DDD9] bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'>
                        <tr>
                            {['time', 'gateway', 'meter', 'voltage', 'averageCurrent', ...(isThreePhase ? ['l1Current', 'l2Current', 'l3Current'] : []), 'activePower', 'status'].map((key) => (
                                <th key={key} className='whitespace-nowrap px-4 py-3 font-medium'>{t(`historyData.${key}`)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={isThreePhase ? 10 : 7} className='px-4 py-8 text-center text-muted-foreground'>{t('historyData.noData')}</td></tr>
                        ) : rows.map((row) => (
                            <tr key={row.bucketTs} className='border-t border-[#E1E5E2]'>
                                <td className='px-4 py-3'>{formatDisplayTime(row.bucket, timeZone)}</td>
                                <td className='px-4 py-3'>{getGatewayDisplayName(gateways.find((g) => g.uid === gatewayUid)!, t)}</td>
                                <td className='px-4 py-3'>{meterId}</td>
                                <td className='px-4 py-3'>{row.voltage ?? '—'}</td>
                                <td className='px-4 py-3'>{row.avgCurrent ?? '—'}</td>
                                {isThreePhase && <><td className='px-4 py-3'>{row.ch1Current ?? '—'}</td><td className='px-4 py-3'>{row.ch2Current ?? '—'}</td><td className='px-4 py-3'>{row.ch3Current ?? '—'}</td></>}
                                <td className='px-4 py-3'>{row.activePower ?? '—'}</td>
                                <td className='px-4 py-3'>{row.sampleCount ? 'OK' : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    )
}

function MetricCheckboxes({ options, selected, onChange }: { options: { key: MetricKey; label: string }[]; selected: SelectedMetrics; onChange: (key: MetricKey, checked: boolean) => void }) {
    return <>{options.map((option) => <MetricCheckbox key={option.key} option={option} selected={selected} onChange={onChange} />)}</>
}

function MetricCheckbox({ option, selected, onChange }: { option: { key: MetricKey; label: string }; selected: SelectedMetrics; onChange: (key: MetricKey, checked: boolean) => void }) {
    return <label className='flex items-center gap-2 text-sm text-[#5F6964]'><input type='checkbox' checked={selected[option.key]} onChange={(event) => onChange(option.key, event.target.checked)} className='h-4 w-4' style={{ accentColor: metricColors[option.key] }} /><span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: metricColors[option.key] }} />{option.label}</label>
}

function getMetricLabel(metric: MetricKey, t: (key: string) => string) {
    const labels: Record<MetricKey, string> = { voltage: 'historyData.voltage', activePower: 'historyData.activePower', avgCurrent: 'historyData.averageCurrent', ch1Current: 'historyData.l1Current', ch2Current: 'historyData.l2Current', ch3Current: 'historyData.l3Current' }
    return t(labels[metric])
}

function getYDomain(data: { [key in MetricKey]: number | null }[], metrics: MetricKey[]): [number, number] {
    const values = data.flatMap((row) => metrics.flatMap((metric) => row[metric] == null ? [] : [row[metric]!]))
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

function getDefaultRange(axis: TimeseriesAxis, timeZone: string) {
    const now = new Date()
    const end = formatDateTimeLocal(now, timeZone)
    if (axis === 'minute') {
        return { start: formatDateTimeLocal(new Date(now.getTime() - 60 * 60 * 1000), timeZone), end }
    }

    const parts = getLocalDateParts(now, timeZone)
    const localDay = Date.UTC(parts.year, parts.month - 1, parts.day)
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

function formatWallClockDate(date: Date) {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}T00:00`
}

function getLocalDateParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) }
}

function formatDisplayTime(value: string, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
    }).format(new Date(value))
}

function parseDateTimeLocal(value: string, timeZone: string) {
    const [datePart, timePart] = value.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute)
    const firstGuess = new Date(wallClockAsUtc)
    const offset = getTimeZoneOffset(firstGuess, timeZone)
    return new Date(wallClockAsUtc - offset).toISOString()
}

function getTimeZoneOffset(date: Date, timeZone: string) {
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
    return Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
    ) - date.getTime()
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return <label className='flex min-w-0 flex-col gap-1.5 text-sm text-[#5F6964]'><span>{label}</span>{children}</label>
}
