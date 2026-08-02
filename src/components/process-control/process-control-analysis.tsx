'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

type Props = { gateways: Gateway[]; meters: Meter[] }

const emptyChartData = Array.from({ length: 13 }, (_, index) => ({ time: `${index * 2}:00`, value: null }))

export function ProcessControlAnalysis({ gateways, meters }: Props) {
    const { t } = useI18n()
    const [gatewayUid, setGatewayUid] = useState(gateways[0]?.uid ?? '')
    const [meterId, setMeterId] = useState(meters[0]?.macId ?? '')
    const [metric, setMetric] = useState('active-power')
    const [range, setRange] = useState('daily')
    const [date, setDate] = useState('2026-07-29')
    const [lowerLimit, setLowerLimit] = useState('0.00')
    const [upperLimit, setUpperLimit] = useState('647.21')

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )

    function handleHubChange(value: string) {
        setGatewayUid(value)
        const firstMeter = meters.find((meter) => meter.gatewayUID === value)
        setMeterId(firstMeter?.macId ?? '')
    }

    return (
        <div className='flex min-h-full flex-col gap-7 pb-8'>
            <div className='flex items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('processControl.title')}</h1>
                <span className='rounded-full bg-[#EAF5EF] px-4 py-2 text-sm font-medium text-[#357A59]'>
                    {t('processControl.normal')}
                </span>
            </div>

            <section className='border border-[#D8DDD9] bg-white p-4'>
                <div className='grid gap-3 xl:grid-cols-7'>
                    <Field label={t('processControl.timeRange')}>
                        <select
                            value={range}
                            onChange={(event) => setRange(event.target.value)}
                            className='control-input'>
                            <option value='daily'>{t('processControl.daily')}</option>
                            <option value='weekly'>{t('processControl.weekly')}</option>
                            <option value='monthly'>{t('processControl.monthly')}</option>
                        </select>
                    </Field>
                    <Field label={t('processControl.date')}>
                        <input
                            type='date'
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('processControl.gateway')}>
                        <select
                            value={gatewayUid}
                            onChange={(event) => handleHubChange(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('processControl.selectGateway')}</option>
                            {gateways.map((hub) => (
                                <option key={hub.uid} value={hub.uid}>
                                    {getGatewayDisplayName(hub, t)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('processControl.meter')}>
                        <select
                            value={meterId}
                            onChange={(event) => setMeterId(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('processControl.selectMeter')}</option>
                            {availableMeters.map((meter) => (
                                <option key={meter.macId} value={meter.macId}>
                                    {meter.name || meter.macId}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('processControl.metric')}>
                        <select
                            value={metric}
                            onChange={(event) => setMetric(event.target.value)}
                            className='control-input'>
                            <option value='active-power'>{t('processControl.activePower')}</option>
                            <option value='voltage'>{t('overview.voltage')}</option>
                            <option value='current'>{t('overview.averageCurrent')}</option>
                        </select>
                    </Field>
                    <Field label={t('processControl.lowerLimit')}>
                        <input
                            value={lowerLimit}
                            onChange={(event) => setLowerLimit(event.target.value)}
                            inputMode='decimal'
                            className='control-input text-right'
                        />
                    </Field>
                    <Field label={t('processControl.upperLimit')}>
                        <input
                            value={upperLimit}
                            onChange={(event) => setUpperLimit(event.target.value)}
                            inputMode='decimal'
                            className='control-input text-right'
                        />
                    </Field>
                </div>
                <button
                    type='button'
                    className='mt-3 flex h-8 w-32 items-center justify-center gap-2 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D]'>
                    <Search className='h-4 w-4' />
                    {t('processControl.query')}
                </button>
            </section>

            <section className='grid grid-cols-2 border border-[#D8DDD9] bg-white md:grid-cols-5'>
                <Summary label={t('processControl.latest')} value='—' />
                <Summary label={t('processControl.average')} value='—' />
                <Summary label={t('processControl.minimum')} value='—' />
                <Summary label={t('processControl.maximum')} value='—' />
                <Summary label={t('processControl.exceeded')} value='—' />
            </section>

            <section className='border border-[#D8DDD9] bg-white p-7'>
                <div className='mb-8 flex items-center justify-between'>
                    <h2 className='text-2xl font-bold'>{t('processControl.activePower')}</h2>
                    <span className='text-sm text-[#7B8580]'>{t('processControl.sampleCount')}: —</span>
                </div>
                <div className='h-[26rem] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={emptyChartData} margin={{ top: 20, right: 18, left: 18, bottom: 8 }}>
                            <CartesianGrid stroke='#E5E9E6' vertical />
                            <XAxis
                                dataKey='time'
                                tick={{ fill: '#7B8580', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                domain={[Number(lowerLimit) || 0, Number(upperLimit) || 1]}
                                tick={{ fill: '#7B8580', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip />
                            <ReferenceLine y={Number(lowerLimit) || 0} stroke='#D8665C' strokeDasharray='8 7' />
                            <ReferenceLine y={Number(upperLimit) || 0} stroke='#D8665C' strokeDasharray='8 7' />
                            <Line
                                type='monotone'
                                dataKey='value'
                                stroke='#287A5F'
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className='mt-3 flex justify-end gap-5 text-xs text-[#7B8580]'>
                    <span>UCL {upperLimit}</span>
                    <span>CL —</span>
                    <span>LCL {lowerLimit}</span>
                </div>
                <p className='mt-6 text-center text-sm text-[#8A938E]'>{t('processControl.dataUnavailable')}</p>
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

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className='border-b border-r border-[#D8DDD9] px-5 py-6 last:border-r-0 md:border-b-0'>
            <p className='text-sm text-[#7B8580]'>{label}</p>
            <p className='mt-7 font-mono text-3xl font-semibold'>{value}</p>
        </div>
    )
}
