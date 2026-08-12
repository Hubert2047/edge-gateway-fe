'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { getGatewayDisplayName } from '@/lib/gateway'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { useI18n } from '@/lib/i18n'
import { Field } from '../ui/field'

type Props = { gateways: Gateway[]; meters: Meter[] }
type ProcessRule = {
    id: string
    name: string
    gatewayId: string
    meterId: string
    metric: string
    lower: string
    upper: string
    enabled: boolean
}

export function ProcessRulesView({ gateways, meters }: Props) {
    const { t } = useI18n()
    const [rules, setRules] = useState<ProcessRule[]>([])
    const [newRule, setNewRule] = useState<Omit<ProcessRule, 'id' | 'enabled'>>({
        name: '',
        gatewayId: gateways[0]?.id ? String(gateways[0].id) : '',
        meterId: '',
        metric: 'active-power',
        lower: '',
        upper: '',
    })

    const availableMeters = useMemo(
        () => meters.filter((meter) => !newRule.gatewayId || meter.gatewayId === Number(newRule.gatewayId)),
        [meters, newRule.gatewayId],
    )

    function updateRule(id: string, patch: Partial<ProcessRule>) {
        setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
    }

    function addRule() {
        if (!newRule.name.trim()) return
        setRules((current) => [...current, { ...newRule, id: crypto.randomUUID(), enabled: true }])
        setNewRule((current) => ({ ...current, name: '', lower: '', upper: '' }))
    }

    function deleteRule(id: string) {
        setRules((current) => current.filter((rule) => rule.id !== id))
    }

    return (
        <div className='flex h-full min-h-0 flex-col gap-7 overflow-y-auto pb-8'>
            <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#D8DDD9] bg-[#F7F5F0] pt-1 pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('processRules.title')}</h1>
                <span className='border border-[#BFC8C2] px-4 py-2 text-sm text-[#357A59]'>
                    {rules.length} {t('processRules.rules')}
                </span>
            </div>

            <section className='overflow-x-auto border border-[#D8DDD9] bg-white'>
                <table className='w-full min-w-[980px] text-sm'>
                    <thead className='bg-[#F1F2EF] text-left text-[#4F5A54]'>
                        <tr>
                            <th className='w-36 px-4 py-3 font-medium'>{t('processRules.status')}</th>
                            <th className='min-w-72 px-4 py-3 font-medium'>{t('processRules.ruleName')}</th>
                            <th className='min-w-72 px-4 py-3 font-medium'>{t('processRules.gatewayMetric')}</th>
                            <th className='min-w-72 px-4 py-3 font-medium'>{t('processRules.meterThreshold')}</th>
                            <th className='w-32 px-4 py-3 font-medium'>{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={5} className='px-4 py-10 text-center text-muted-foreground'>
                                    {t('processRules.noRules')}
                                </td>
                            </tr>
                        ) : (
                            rules.map((rule) => (
                                <tr key={rule.id} className='border-t border-[#E1E5E2] align-top'>
                                    <td className='px-4 py-4'>
                                        <label className='flex items-center gap-3'>
                                            <input
                                                type='checkbox'
                                                checked={rule.enabled}
                                                onChange={(event) =>
                                                    updateRule(rule.id, { enabled: event.target.checked })
                                                }
                                                className='h-4 w-4 accent-[#1677D2]'
                                            />
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs ${rule.enabled ? 'bg-[#EAF5EF] text-[#357A59]' : 'bg-[#F1F2EF] text-[#7B8580]'}`}>
                                                {rule.enabled ? t('common.enabled') : t('common.disabled')}
                                            </span>
                                        </label>
                                    </td>
                                    <td className='px-4 py-4'>
                                        <Field label={t('processRules.ruleName')}>
                                            <input
                                                value={rule.name}
                                                onChange={(event) => updateRule(rule.id, { name: event.target.value })}
                                                className='control-input'
                                            />
                                        </Field>
                                    </td>
                                    <td className='space-y-3 px-4 py-4'>
                                        <Field label={t('processRules.gateway')}>
                                            <select
                                                value={rule.gatewayId}
                                                onChange={(event) =>
                                                    updateRule(rule.id, { gatewayId: event.target.value })
                                                }
                                                className='control-input'>
                                                {gateways.map((gateway) => (
                                                    <option key={gateway.id} value={gateway.id}>
                                                        {getGatewayDisplayName(gateway, t)}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label={t('processRules.metric')}>
                                            <select
                                                value={rule.metric}
                                                onChange={(event) =>
                                                    updateRule(rule.id, { metric: event.target.value })
                                                }
                                                className='control-input'>
                                                <option value='active-power'>{t('processRules.activePower')}</option>
                                                <option value='current'>{t('historyData.averageCurrent')}</option>
                                                <option value='voltage'>{t('overview.voltage')}</option>
                                            </select>
                                        </Field>
                                    </td>
                                    <td className='space-y-3 px-4 py-4'>
                                        <Field label={t('processRules.meter')}>
                                            <select
                                                value={rule.meterId}
                                                onChange={(event) =>
                                                    updateRule(rule.id, { meterId: event.target.value })
                                                }
                                                className='control-input'>
                                                <option value=''>{t('processRules.allMeters')}</option>
                                                {meters
                                                    .filter((meter) => meter.gatewayId === Number(rule.gatewayId))
                                                    .map((meter) => (
                                                        <option key={meter.macId} value={meter.macId}>
                                                            {meter.name || meter.macId}
                                                        </option>
                                                    ))}
                                            </select>
                                        </Field>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <Field label={t('processRules.lower')}>
                                                <input
                                                    value={rule.lower}
                                                    onChange={(event) =>
                                                        updateRule(rule.id, { lower: event.target.value })
                                                    }
                                                    className='control-input'
                                                />
                                            </Field>
                                            <Field label={t('processRules.upper')}>
                                                <input
                                                    value={rule.upper}
                                                    onChange={(event) =>
                                                        updateRule(rule.id, { upper: event.target.value })
                                                    }
                                                    className='control-input'
                                                />
                                            </Field>
                                        </div>
                                    </td>
                                    <td className='space-y-2 px-4 py-4'>
                                        <button
                                            type='button'
                                            onClick={() => updateRule(rule.id, {})}
                                            className='h-8 w-full bg-[#153F31] text-sm font-medium text-white'>
                                            {t('common.save')}
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => deleteRule(rule.id)}
                                            className='h-8 w-full bg-[#FAE1DD] text-sm font-medium text-[#B54E45]'>
                                            {t('common.delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>

            <section className='border border-[#D8DDD9] bg-white p-7'>
                <h2 className='mb-6 text-2xl font-bold'>{t('processRules.addTitle')}</h2>
                <div className='grid gap-4 bg-[#F7F8F5] p-5 md:grid-cols-3'>
                    <Field label={t('processRules.ruleName')}>
                        <input
                            value={newRule.name}
                            onChange={(event) => setNewRule({ ...newRule, name: event.target.value })}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('processRules.gateway')}>
                        <select
                            value={newRule.gatewayId}
                            onChange={(event) =>
                                setNewRule({ ...newRule, gatewayId: event.target.value, meterId: '' })
                            }
                            className='control-input'>
                            <option value=''>{t('processRules.selectGateway')}</option>
                            {gateways.map((gateway) => (
                                <option key={gateway.id} value={gateway.id}>
                                    {getGatewayDisplayName(gateway, t)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('processRules.meter')}>
                        <select
                            value={newRule.meterId}
                            onChange={(event) => setNewRule({ ...newRule, meterId: event.target.value })}
                            className='control-input'>
                            <option value=''>{t('processRules.allMeters')}</option>
                            {availableMeters.map((meter) => (
                                <option key={meter.macId} value={meter.macId}>
                                    {meter.name || meter.macId}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('processRules.metric')}>
                        <select
                            value={newRule.metric}
                            onChange={(event) => setNewRule({ ...newRule, metric: event.target.value })}
                            className='control-input'>
                            <option value='active-power'>{t('processRules.activePower')}</option>
                            <option value='current'>{t('historyData.averageCurrent')}</option>
                            <option value='voltage'>{t('overview.voltage')}</option>
                        </select>
                    </Field>
                    <Field label={t('processRules.lower')}>
                        <input
                            value={newRule.lower}
                            onChange={(event) => setNewRule({ ...newRule, lower: event.target.value })}
                            className='control-input'
                        />
                    </Field>
                    <Field label={t('processRules.upper')}>
                        <input
                            value={newRule.upper}
                            onChange={(event) => setNewRule({ ...newRule, upper: event.target.value })}
                            className='control-input'
                        />
                    </Field>
                    <button
                        type='button'
                        onClick={addRule}
                        className='h-8 bg-[#153F31] text-sm font-medium text-white hover:bg-[#1B503D] md:col-start-3'>
                        {t('common.add')}
                    </button>
                </div>
            </section>
        </div>
    )
}
