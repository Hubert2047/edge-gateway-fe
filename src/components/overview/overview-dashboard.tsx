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
import { ClientRelativeTime } from '../cloud-sync/client-relative-time'

type OverviewDashboardProps = {
    gateways: Gateway[]
    cloudTargets: CloudTarget[]
    meters: Meter[]
    uploadedToday: number
    canManage: boolean
}

export function OverviewDashboard({ gateways, cloudTargets, meters, canManage, uploadedToday }: OverviewDashboardProps) {
    const { t, locale } = useI18n()
    const router = useRouter()
    const activePowerQuery = useOverviewActivePower()
    const activePowerByMeter = activePowerQuery.data ?? {}
    const enabledGateways = gateways.filter(
        (gateway) => gateway.enabled && (gateway.isOnline ?? gateway.isVirtual)
    ).length
    const enabledCloudTargets = cloudTargets.filter((target) => target.enabled).length
    const realtimePending = cloudTargets.reduce((sum, target) => sum + (target.realtimePending ?? 0), 0)
    const gatewayNames = new Map(gateways.map((gateway) => [gateway.uid, getGatewayDisplayName(gateway, t)]))

    return (
        <div className='flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-6'>
            <div className='sticky top-0 z-10 flex shrink-0 items-center justify-between bg-[#F7F5F0]'>
                <h1 className='text-3xl font-bold tracking-tight'>{t('overview.title')}</h1>
                <button
                    type='button'
                    onClick={() => router.refresh()}
                    className='flex items-center gap-2 border border-[#BFC8C2] bg-transparent px-3 py-1 text-sm font-medium hover:bg-white'>
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
                    value={uploadedToday}
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
                            gateways.map((gateway) => {
                                const isOnline = gateway.enabled && (gateway.isOnline ?? gateway.isVirtual)
                                return (
                                    <div key={gateway.uid} className='flex items-center gap-4 p-4'>
                                        <StatusDot active={isOnline} />
                                        <div className='min-w-0 flex-1'>
                                            <p className='font-semibold'>{getGatewayDisplayName(gateway, t)}</p>
                                            <p className='text-sm text-[#7B8580]'>
                                                {gateway.meterCount} {t('overview.meters')}
                                            </p>
                                        </div>
                                        <p className='text-xs text-[#7B8580]'>
                                            <ClientRelativeTime
                                                value={gateway.lastSeenAt}
                                                locale={locale}
                                                fallback={String(t('cloud.notUploaded'))}
                                            />
                                        </p>
                                    </div>
                                )
                            })
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
                                <div key={target.id} className='flex items-center gap-4 p-4'>
                                    <StatusDot active={target.enabled} />
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-semibold'>{target.name}</p>
                                        <p className='truncate text-sm text-[#7B8580]'>{target.apiKey}</p>
                                    </div>
                                    <div className='text-right text-sm'>
                                        <div className='flex gap-2'>
                                            <div className='flex gap-2 text-xs text-[#7B8580]'>
                                                <p className=''>{t('cloud.lastUpload')}</p>
                                                <ClientRelativeTime
                                                    value={target.lastUploadAt}
                                                    locale={locale}
                                                    fallback={String(t('cloud.notUploaded'))}
                                                />

                                            </div>
                                        </div>
                                        <div className='flex gap-2 mt-2 text-xs text-[#7B8580]'>
                                            <p>{t('overview.realtimePending')}: {target.realtimePending ?? 0}</p>
                                            <p>
                                                {target.backfill
                                                    ? ` · ${t('overview.backfill')}: ${target.backfill.createdCount}/${target.backfill.estimatedTotalCount}`
                                                    : ''}
                                            </p>
                                        </div>
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
                                    className={`border-t-4 ${meter.enabled ? 'border-[#64BD91]' : 'border-[#D8665C]'} flex flex-col gap-3 border-x border-b border-[#D8DDD9] bg-white p-4`}>
                                    <div className='flex items-start justify-between gap-3'>
                                        <div className='flex items-center gap-3'>
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
                                    <div className='grid grid-cols-2 gap-4 border-y border-[#E4E8E5] py-2 text-sm sm:grid-cols-4'>
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
