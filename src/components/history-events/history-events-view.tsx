'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { getGatewayDisplayName } from '@/lib/gateway'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { useI18n } from '@/lib/i18n'

type Props = { gateways: Gateway[]; meters: Meter[] }
type EventRow = {
    time: string
    rule: string
    gateway: string
    meter: string
    metric: string
    value: string
    threshold: string
    reason: string
}

export function HistoryEventsView({ gateways, meters }: Props) {
    const { t } = useI18n()
    const [range, setRange] = useState('daily')
    const [date, setDate] = useState('2026-07-23')
    const [gatewayUid, setGatewayUid] = useState('')
    const [meterId, setMeterId] = useState('')
    const [rule, setRule] = useState('')
    const [rows, setRows] = useState<EventRow[]>([])

    const availableMeters = useMemo(
        () => meters.filter((meter) => !gatewayUid || meter.gatewayUID === gatewayUid),
        [gatewayUid, meters],
    )

    function handleGatewayChange(value: string) {
        setGatewayUid(value)
        setMeterId('')
    }

    return (
        <div className='flex min-h-full flex-col gap-7 pb-8'>
            <div className='flex items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('historyEvents.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {rows.length} {t('historyEvents.records')}
                </span>
            </div>

            <section className='border border-[#D8DDD9] bg-white p-4'>
                <div className='grid gap-3 xl:grid-cols-5'>
                    <Field label={t('historyEvents.timeRange')}>
                        <select
                            value={range}
                            onChange={(event) => setRange(event.target.value)}
                            className='control-input'>
                            <option value='daily'>{t('historyEvents.daily')}</option>
                            <option value='weekly'>{t('historyEvents.weekly')}</option>
                            <option value='monthly'>{t('historyEvents.monthly')}</option>
                        </select>
                    </Field>
                    <Field label={t('historyEvents.date')}>
                        <input
                            type='date'
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('historyEvents.gateway')}>
                        <select
                            value={gatewayUid}
                            onChange={(event) => handleGatewayChange(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyEvents.allGateways')}</option>
                            {gateways.map((gateway) => (
                                <option key={gateway.uid} value={gateway.uid}>
                                    {getGatewayDisplayName(gateway, t)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyEvents.meter')}>
                        <select
                            value={meterId}
                            onChange={(event) => setMeterId(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyEvents.allMeters')}</option>
                            {availableMeters.map((meter) => (
                                <option key={meter.macId} value={meter.macId}>
                                    {meter.name || meter.macId}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('historyEvents.rule')}>
                        <select
                            value={rule}
                            onChange={(event) => setRule(event.target.value)}
                            className='control-input'>
                            <option value=''>{t('historyEvents.allRules')}</option>
                        </select>
                    </Field>
                </div>
                <button
                    type='button'
                    onClick={() => setRows([])}
                    className='mt-3 h-8 w-32 bg-[#153F31] px-2.5 text-sm font-medium text-white hover:bg-[#1B503D]'>
                    {t('historyEvents.query')}
                </button>
            </section>

            <section className='overflow-hidden border border-[#D8DDD9] bg-white'>
                <div className='overflow-x-auto'>
                    <table className='w-full min-w-[980px] text-sm'>
                        <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'>
                            <tr>
                                {[
                                    'time',
                                    'ruleName',
                                    'gateway',
                                    'meter',
                                    'metric',
                                    'triggerValue',
                                    'threshold',
                                    'reason',
                                ].map((key) => (
                                    <th key={key} className='whitespace-nowrap px-4 py-3 font-medium'>
                                        {t(`historyEvents.${key}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className='px-4 py-10 text-center text-muted-foreground'>
                                        {t('historyEvents.noData')}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.time} className='border-t border-[#E1E5E2]'>
                                        <td className='px-4 py-3'>{row.time}</td>
                                        <td className='px-4 py-3'>{row.rule}</td>
                                        <td className='px-4 py-3'>{row.gateway}</td>
                                        <td className='px-4 py-3'>{row.meter}</td>
                                        <td className='px-4 py-3'>{row.metric}</td>
                                        <td className='px-4 py-3 font-semibold text-[#B54E45]'>{row.value}</td>
                                        <td className='px-4 py-3'>{row.threshold}</td>
                                        <td className='px-4 py-3'>
                                            <span className='rounded-full bg-[#FAE1DD] px-3 py-1 text-xs text-[#B54E45]'>
                                                {row.reason}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
