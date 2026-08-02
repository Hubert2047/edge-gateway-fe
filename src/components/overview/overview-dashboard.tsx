'use client'

import { ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import type { CloudTarget } from '@/types/cloud-target'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

type OverviewDashboardProps = {
    gateways: Gateway[]
    cloudTargets: CloudTarget[]
    meters: Meter[]
    canManage: boolean
}

function StatusDot({ active }: { active: boolean }) {
    return (
        <span
            className={`h-3 w-3 shrink-0 rounded-full ${active ? 'bg-[#64BD91] shadow-[0_0_0_6px_#EAF5EF]' : 'bg-[#D8665C] shadow-[0_0_0_6px_#FAEAE8]'}`}
        />
    )
}

function formatValue(value: number | null, suffix = '') {
    return value === null ? '—' : `${value.toFixed(2)}${suffix}`
}

export function OverviewDashboard({ gateways, cloudTargets, meters, canManage }: OverviewDashboardProps) {
    const { t } = useI18n()
    const router = useRouter()
    const enabledGateways = gateways.filter((gateway) => gateway.enabled).length
    const enabledCloudTargets = cloudTargets.filter((target) => target.enabled).length
    const pendingUploads = cloudTargets.reduce((sum, target) => sum + (target.pendingReadings ?? 0), 0)

    return (
        <div className='flex min-h-full flex-col gap-8 pb-8'>
            <div className='flex items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('overview.title')}</h1>
                <button
                    type='button'
                    onClick={() => router.refresh()}
                    className='flex items-center gap-2 border border-[#BFC8C2] bg-transparent px-4 py-3 text-sm font-medium hover:bg-white'>
                    <RefreshCw className='h-4 w-4' />
                    {t('overview.refresh')}
                </button>
            </div>

            <section className='grid grid-cols-2 border border-[#D8DDD9] bg-white md:grid-cols-5'>
                <Summary label={t('overview.gatewayOnline')} value={enabledGateways} suffix={`/ ${gateways.length}`} />
                <Summary
                    label={t('overview.cloudOnline')}
                    value={enabledCloudTargets}
                    suffix={`/ ${cloudTargets.length}`}
                />
                <Summary label={t('overview.meterCount')} value={meters.length} />
                <Summary
                    label={t('overview.uploaded')}
                    value={cloudTargets.reduce((sum, target) => sum + (target.lastUploadAt ? 1 : 0), 0)}
                />
                <Summary label={t('overview.pending')} value={pendingUploads} />
            </section>

            <div className='grid gap-8 lg:grid-cols-2'>
                <OverviewSection title={t('overview.gatewayStatus')} href='/gateways' action={t('common.settings')} canManage={canManage}>
                    <div className='divide-y divide-[#D8DDD9] border border-[#D8DDD9] bg-white'>
                        {gateways.length === 0 ? (
                            <EmptyState text={t('overview.noGateways')} />
                        ) : (
                            gateways.map((gateway) => (
                                <div key={gateway.uid} className='flex items-center gap-4 px-5 py-5'>
                                    <StatusDot active={gateway.enabled} />
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-semibold'>{gateway.name}</p>
                                        <p className='text-sm text-[#7B8580]'>
                                            {gateway.meterCount} {t('overview.meters')}
                                        </p>
                                    </div>
                                    <span className='text-sm text-[#7B8580]'>
                                        {gateway.enabled ? t('overview.monitoring') : t('common.disabled')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </OverviewSection>

                <OverviewSection title={t('overview.cloudStatus')} href='/cloud-sync' action={t('common.settings')} canManage={canManage}>
                    <div className='divide-y divide-[#D8DDD9] border border-[#D8DDD9] bg-white'>
                        {cloudTargets.length === 0 ? (
                            <EmptyState text={t('overview.noCloudTargets')} />
                        ) : (
                            cloudTargets.map((target) => (
                                <div key={target.id} className='flex items-center gap-4 px-5 py-5'>
                                    <StatusDot active={target.enabled} />
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-semibold'>{target.name}</p>
                                        <p className='truncate text-sm text-[#7B8580]'>{target.id}</p>
                                    </div>
                                    <div className='text-right text-sm'>
                                        <span
                                            className={`inline-block rounded-full px-3 py-1 ${target.enabled ? 'bg-[#EAF5EF] text-[#357A59]' : 'bg-[#FAEAE8] text-[#B54E45]'}`}>
                                            {target.enabled ? t('overview.online') : t('common.disabled')}
                                        </span>
                                        <p className='mt-2 text-xs text-[#7B8580]'>
                                            {t('overview.pending')}: {target.pendingReadings ?? 0}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </OverviewSection>
            </div>

            <OverviewSection title={t('overview.meterStatus')} href='/meters' action={t('common.settings')} canManage={canManage}>
                <div className='grid gap-5 md:grid-cols-2'>
                    {meters.length === 0 ? (
                        <div className='border border-[#D8DDD9] bg-white'>
                            <EmptyState text={t('overview.noMeters')} />
                        </div>
                    ) : (
                        meters.map((meter) => (
                            <div
                                key={meter.macId}
                                className={`border-t-4 ${meter.enabled ? 'border-[#64BD91]' : 'border-[#D8665C]'} border-x border-b border-[#D8DDD9] bg-white p-6`}>
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='flex items-center gap-4'>
                                        <StatusDot active={meter.enabled} />
                                        <div>
                                            <p className='font-semibold'>{meter.name || meter.macId}</p>
                                            <p className='text-sm text-[#7B8580]'>{meter.gatewayUID}</p>
                                        </div>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-sm ${meter.enabled ? 'bg-[#EAF5EF] text-[#357A59]' : 'bg-[#FAEAE8] text-[#B54E45]'}`}>
                                        {meter.enabled ? t('overview.online') : t('common.disabled')}
                                    </span>
                                </div>
                                <div className='my-5 grid grid-cols-2 gap-4 border-y border-[#E4E8E5] py-4 text-sm sm:grid-cols-4'>
                                    <Metric label={t('overview.voltage')} value={formatValue(meter.voltage, ' V')} />
                                    <Metric label={t('overview.averageCurrent')} value='—' />
                                    <Metric label='L1' value='—' />
                                    <Metric label='L2 / L3' value='—' />
                                </div>
                                <p className='text-sm text-[#8A938E]'>{t('overview.latestDataUnavailable')}</p>
                            </div>
                        ))
                    )}
                </div>
            </OverviewSection>
        </div>
    )
}

function Summary({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
    return (
        <div className='border-b border-r border-[#D8DDD9] px-5 py-6 last:border-r-0 md:border-b-0'>
            <p className='text-sm text-[#7B8580]'>{label}</p>
            <p className='mt-6 text-3xl font-semibold'>
                {value} <span className='text-xl text-[#AAB2AD]'>{suffix}</span>
            </p>
        </div>
    )
}

function OverviewSection({
    title,
    href,
    action,
    canManage,
    children,
}: {
    title: string
    href: string
    action: string
    canManage: boolean
    children: ReactNode
}) {
    return (
        <section>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-2xl font-bold'>{title}</h2>
                {canManage && (
                    <Link
                        href={href}
                        className='flex items-center gap-1 text-sm font-medium text-[#438466] hover:underline'>
                        {action}
                        <ArrowRight className='h-4 w-4' />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}

function EmptyState({ text }: { text: string }) {
    return <p className='px-5 py-8 text-sm text-[#7B8580]'>{text}</p>
}
function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className='text-xs text-[#8A938E]'>{label}</p>
            <p className='mt-2 font-mono font-semibold'>{value}</p>
        </div>
    )
}
