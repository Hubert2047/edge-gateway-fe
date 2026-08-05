'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import { ApiError } from '@/lib/api/client'
import { useTimeseries } from '@/lib/api/timeseries'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import type { TimeseriesAxis } from '@/types/timeseries'

type Props = { gateways: Gateway[]; meters: Meter[] }
export function HistoryDataView({ gateways, meters }: Props) {
    const { t } = useI18n()
    const [axis, setAxis] = useState<TimeseriesAxis>('hour')
    const [date, setDate] = useState(() => new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16))
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [gatewayUid, setGatewayUid] = useState(gateways[0]?.uid ?? '')
    const [meterId, setMeterId] = useState(meters[0]?.macId ?? '')
    const [metric, setMetric] = useState('average-current')
    const [threePhase, setThreePhase] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )

    function handleGatewayChange(value: string) {
        setGatewayUid(value)
        const nextMeter = meters.find((meter) => meter.gatewayUID === value)
        setMeterId(nextMeter?.macId ?? '')
    }

    const params = { gatewayUid, meterId, axis, start: new Date(date).toISOString(), end: new Date(endDate).toISOString() }
    const query = useTimeseries(params, submitted && Boolean(gatewayUid && meterId))
    const rows = query.data ?? []

    const chartData = rows.map((row) => ({
        time: row.bucket,
        value: metric === 'voltage' ? row.voltage : metric === 'active-power' ? row.activePower : row.avgCurrent,
    }))

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
                    <Field label={t('historyData.timeRange')}>
                        <select
                            value={axis}
                            onChange={(event) => setAxis(event.target.value as TimeseriesAxis)}
                            className='control-input'>
                            <option value='minute'>Minute</option>
                            <option value='hour'>Hour</option>
                            <option value='day'>Day</option>
                            <option value='month'>Month</option>
                        </select>
                    </Field>
                    <Field label={t('historyData.date')}>
                        <input
                            type='datetime-local'
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className='control-input'
                        />
                    </Field>
                    <Field label='End'>
                        <input type='datetime-local' value={endDate} onChange={(event) => setEndDate(event.target.value)} className='control-input' />
                    </Field>
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
                            onChange={(event) => setMeterId(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyData.selectMeter')}</option>
                            {availableMeters.map((meter) => (
                                <option key={meter.macId} value={meter.macId}>
                                    {meter.name || meter.macId}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyData.metric')}>
                        <select
                            value={metric}
                            onChange={(event) => setMetric(event.target.value)}
                            className='control-input'>
                            <option value='average-current'>{t('historyData.averageCurrent')}</option>
                            <option value='voltage'>{t('overview.voltage')}</option>
                            <option value='active-power'>{t('processControl.activePower')}</option>
                        </select>
                    </Field>
                </div>
                <div className='mt-3 flex items-center gap-3'>
                    <label className='flex items-center gap-2 text-sm text-[#5F6964]'>
                        <input
                            type='checkbox'
                            checked={threePhase}
                            onChange={(event) => setThreePhase(event.target.checked)}
                            className='h-4 w-4 accent-[#153F31]'
                        />
                        {t('historyData.showThreePhase')}
                    </label>
                    <button
                        type='button'
                        onClick={() => setSubmitted(true)}
                        className='ml-8 h-8 w-32 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D]'>
                        {t('historyData.query')}
                    </button>
                </div>
            </section>

            <section className='border border-[#D8DDD9] bg-white p-7'>
                <div className='mb-8 flex items-center justify-between'>
                    <h2 className='text-2xl font-bold'>{t('historyData.averageCurrent')}</h2>
                    <span className='text-sm text-[#7B8580]'>
                        {rows.length} {t('historyData.samples')}
                    </span>
                </div>
                <div className='h-[27rem] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={chartData} margin={{ top: 20, right: 18, left: 18, bottom: 8 }}>
                            <CartesianGrid stroke='#E5E9E6' vertical />
                            <XAxis
                                dataKey='time'
                                tick={{ fill: '#7B8580', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis tick={{ fill: '#7B8580', fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Line type='monotone' dataKey='value' stroke='#4E8B74' dot={false} connectNulls={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {query.error instanceof ApiError && (
                    <p className='mt-4 text-center text-sm text-[#B54E45]'>{query.error.message}</p>
                )}
                {!query.error && rows.length === 0 && (
                    <p className='mt-4 text-center text-sm text-[#8A938E]'>{t('historyData.dataUnavailable')}</p>
                )}
            </section>

            <section className='overflow-hidden border border-[#D8DDD9] bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'>
                        <tr>
                            {['time', 'gateway', 'meter', 'voltage', 'averageCurrent', 'activePower', 'status'].map(
                                (key) => (
                                    <th key={key} className='whitespace-nowrap px-4 py-3 font-medium'>
                                        {t(`historyData.${key}`)}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className='px-4 py-8 text-center text-muted-foreground'>
                                    {t('historyData.noData')}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.bucketTs} className='border-t border-[#E1E5E2]'>
                                    <td className='px-4 py-3'>{row.bucket}</td>
                                    <td className='px-4 py-3'>{getGatewayDisplayName(gateways.find((g) => g.uid === gatewayUid)!, t)}</td>
                                    <td className='px-4 py-3'>{meterId}</td>
                                    <td className='px-4 py-3'>{row.voltage ?? '—'}</td>
                                    <td className='px-4 py-3'>{row.avgCurrent ?? '—'}</td>
                                    <td className='px-4 py-3'>{row.activePower ?? '—'}</td>
                                    <td className='px-4 py-3'>{row.sampleCount ? 'OK' : '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className='flex min-w-0 flex-col gap-1.5 text-sm text-[#5F6964]'>
            <span>{label}</span>
            {children}
        </label>
    )
}
