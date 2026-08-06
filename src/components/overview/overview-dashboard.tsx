'use client'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import { useOverviewActivePower } from '@/lib/api/overview.queries'
import type { CloudTarget } from '@/types/cloud-target'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { Summary } from './summary'
import { OverviewSection } from './overview-section'
import { EmptyState } from './empty-state'
import { StatusDot } from './statusDot'
import { Metric } from './metric'
import { formatLastPolledAt, formatValue } from '@/lib/utils'
import { MeterSparkline } from './meter-spark-line'

type OverviewDashboardProps = {
    gateways: Gateway[]
    cloudTargets: CloudTarget[]
    meters: Meter[]
    canManage: boolean
}

export function OverviewDashboard({ gateways, cloudTargets, meters, canManage }: OverviewDashboardProps) {
    const { t } = useI18n()
    const router = useRouter()
    const activePowerQuery = useOverviewActivePower()
    const activePowerByMeter = activePowerQuery.data ?? {}
    const enabledGateways = gateways.filter((gateway) => gateway.enabled).length
    const enabledCloudTargets = cloudTargets.filter((target) => target.enabled).length
    const realtimePending = cloudTargets.reduce((sum, target) => sum + (target.realtimePending ?? 0), 0)
    const gatewayNames = new Map(gateways.map((gateway) => [gateway.uid, getGatewayDisplayName(gateway, t)]))

    return (
        <div className='flex min-h-full flex-col gap-5 md:h-full'>
            <div className='flex shrink-0 items-center justify-between border-b border-[#D8DDD9] pb-5'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('overview.title')}</h1>
                <button
                    type='button'
                    onClick={() => router.refresh()}
                    className='flex items-center gap-2 border border-[#BFC8C2] bg-transparent px-4 py-3 text-sm font-medium hover:bg-white'>
                    <RefreshCw className='h-4 w-4' />
                    {t('overview.refresh')}
                </button>
            </div>

            <section className='grid shrink-0 grid-cols-2 border border-[#D8DDD9] bg-white md:grid-cols-5'>
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
                <Summary label={t('overview.realtimePending')} value={realtimePending} />
            </section>

            <div className='grid shrink-0 gap-8 lg:grid-cols-2'>
                <OverviewSection
                    title={t('overview.gatewayStatus')}
                    href='/gateways'
                    action={t('common.settings')}
                    canManage={canManage}>
                    <div className='divide-y divide-[#D8DDD9] border border-[#D8DDD9] bg-white'>
                        {gateways.length === 0 ? (
                            <EmptyState text={t('overview.noGateways')} />
                        ) : (
                            gateways.map((gateway) => (
                                <div key={gateway.uid} className='flex items-center gap-4 px-5 py-5'>
                                    <StatusDot active={gateway.enabled} />
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-semibold'>{getGatewayDisplayName(gateway, t)}</p>
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

                <OverviewSection
                    title={t('overview.cloudStatus')}
                    href='/cloud-sync'
                    action={t('common.settings')}
                    canManage={canManage}>
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
                                            {t('overview.realtimePending')}: {target.realtimePending ?? 0}
                                            {target.backfill
                                                ? ` · ${t('overview.backfill')}: ${target.backfill.createdCount}/${target.backfill.estimatedTotalCount}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </OverviewSection>
            </div>

            <OverviewSection
                title={t('overview.meterStatus')}
                href='/meters'
                action={t('common.settings')}
                canManage={canManage}
                className='md:flex md:min-h-0 md:flex-1 md:flex-col'>
                <div className='grid gap-5 md:min-h-[15rem] md:flex-1 md:overflow-y-auto md:overscroll-contain md:pr-1 md:grid-cols-2'>
                    {meters.length === 0 ? (
                        <div className='border border-[#D8DDD9] bg-white'>
                            <EmptyState text={t('overview.noMeters')} />
                        </div>
                    ) : (
                        meters.map((meter) => {
                            const meterID = meter.meterId ?? meter.macId
                            const overviewData = activePowerByMeter[`${meter.gatewayUID}:${meterID}`]
                            return (
                                <div
                                    key={`${meter.gatewayUID}:${meterID}`}
                                    className={`border-t-4 ${meter.enabled ? 'border-[#64BD91]' : 'border-[#D8665C]'} border-x border-b border-[#D8DDD9] bg-white p-6`}>
                                    <div className='flex items-start justify-between gap-4'>
                                        <div className='flex items-center gap-4'>
                                            <StatusDot active={meter.enabled} />
                                            <div>
                                                <p className='font-semibold'>{meter.name || meterID}</p>
                                                <p className='text-sm text-[#7B8580]'>
                                                    {gatewayNames.get(meter.gatewayUID) ?? '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-sm ${meter.enabled ? 'bg-[#EAF5EF] text-[#357A59]' : 'bg-[#FAEAE8] text-[#B54E45]'}`}>
                                            {meter.enabled ? t('overview.online') : t('common.disabled')}
                                        </span>
                                    </div>
                                    <div className='my-5 grid grid-cols-2 gap-4 border-y border-[#E4E8E5] py-4 text-sm sm:grid-cols-4'>
                                        <Metric
                                            label={t('overview.voltage')}
                                            value={formatValue(meter.voltage, ' V')}
                                        />
                                        <Metric label={t('overview.averageCurrent')} value='—' />
                                        <Metric label='L1' value='—' />
                                        <Metric label='L2 / L3' value='—' />
                                    </div>
                                    <div className='space-y-2'>
                                        <p className='text-xs text-[#8A938E]'>{t('overview.activePower')}</p>
                                        <MeterSparkline
                                            points={overviewData?.activePower ?? []}
                                            loading={activePowerQuery.isLoading}
                                        />
                                        <p className='text-xs text-[#8A938E]'>
                                            {t('overview.lastPolled')}:{' '}
                                            {formatLastPolledAt(overviewData?.lastPolledAt, t)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </OverviewSection>
        </div>
    )
}
