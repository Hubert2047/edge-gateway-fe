'use client'
import { RefreshCw } from 'lucide-react'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import { OVERVIEW_REFETCH_TIME, useOverviewActivePower, useOverviewMeters } from '@/lib/api/overview.queries'
import { useCloudTargets } from '@/lib/api/cloud-target'
import { useGateways } from '@/lib/api/gateway'
import type { CloudTargetListResponse } from '@/types/cloud-target'
import type { Gateway } from '@/types/gateway'
import type { Meter, MeterStatus } from '@/types/meter'
import { Summary } from './summary'
import { OverviewSection } from './overview-section'
import { EmptyState } from './empty-state'
import { StatusDot } from './statusDot'
import { Metric } from './metric'
import {
    formatLastPolledAt,
    formatValue,
    getAverageCurrent,
    getGatewayStatus,
    getMeterStatus,
    transformPhaseMode,
} from '@/lib/utils'
import { MeterSparkline } from './meter-spark-line'
import { ClientRelativeTime } from '../cloud-sync/client-relative-time'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const METER_ORDER_STORAGE_KEY = 'overview.meter-order'

function meterKey(meter: Meter) {
    return `${meter.gatewayId}:${meter.meterId ?? meter.macId}`
}

function reconcileMeterOrder(order: string[], defaultOrder: string[]) {
    const validKeys = new Set(defaultOrder)
    const retained = order.filter((key) => validKeys.has(key))
    const retainedKeys = new Set(retained)
    return [...retained, ...defaultOrder.filter((key) => !retainedKeys.has(key))]
}

type OverviewDashboardProps = {
    initialGateways: Gateway[]
    cloudTargetList: CloudTargetListResponse
    initialMeters: Meter[]
    canManage: boolean
}

export const STATUS_STYLE: Record<MeterStatus, { border: string; badgeBg: string; badgeText: string }> = {
    online: { border: 'border-[#64BD91]', badgeBg: 'bg-[#EAF5EF]', badgeText: 'text-[#357A59]' },
    offline: { border: 'border-[#D8665C]', badgeBg: 'bg-[#FAEAE8]', badgeText: 'text-[#B54E45]' },
    disabled: { border: 'border-[#BFC8C2]', badgeBg: 'bg-[#EDEEEC]', badgeText: 'text-[#7B8580]' },
}

export function OverviewDashboard({
    initialGateways,
    cloudTargetList,
    initialMeters,
    canManage,
}: OverviewDashboardProps) {
    const { t, locale } = useI18n()
    const activePowerQuery = useOverviewActivePower()
    const cloudTargetsQuery = useCloudTargets(cloudTargetList)
    const gatewaysQuery = useGateways(initialGateways)
    const gateways = gatewaysQuery.data
    const metersQuery = useOverviewMeters(initialMeters)
    const meters = metersQuery.data

    const activePowerByMeter = activePowerQuery.data ?? {}
    const cloudTargets = cloudTargetsQuery.data?.targets ?? []
    const uploadedToday = cloudTargetsQuery.data?.uploadedToday ?? 0
    const [selectedGatewayId, setSelectedGatewayId] = useState('all')
    const gatewayOrder = useMemo(() => new Map(gateways.map((gateway, index) => [gateway.id, index])), [gateways])
    const defaultMeterOrder = useMemo(
        () =>
            [...meters]
                .sort((a, b) => {
                    const gatewayDifference =
                        (gatewayOrder.get(a.gatewayId) ?? Number.MAX_SAFE_INTEGER) -
                        (gatewayOrder.get(b.gatewayId) ?? Number.MAX_SAFE_INTEGER)
                    if (gatewayDifference !== 0) return gatewayDifference
                    return (a.name || a.meterId || a.macId).localeCompare(b.name || b.meterId || b.macId)
                })
                .map(meterKey),
        [gatewayOrder, meters],
    )
    const [meterOrder, setMeterOrder] = useState<string[]>(defaultMeterOrder)
    const [draggedMeterKey, setDraggedMeterKey] = useState<string | null>(null)
    const loadedMeterOrder = useRef(false)

    useEffect(() => {
        let savedOrder: string[] = []
        try {
            const stored = window.localStorage.getItem(METER_ORDER_STORAGE_KEY)
            const parsed = stored ? JSON.parse(stored) : null
            if (Array.isArray(parsed) && parsed.every((key): key is string => typeof key === 'string')) {
                savedOrder = parsed
            }
        } catch {
            savedOrder = []
        }
        // Hydrate the client-only layout after reading browser storage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMeterOrder(reconcileMeterOrder(savedOrder, defaultMeterOrder))
        loadedMeterOrder.current = true
    }, [defaultMeterOrder])

    const orderedMeters = useMemo(() => {
        const metersByKey = new Map(meters.map((meter) => [meterKey(meter), meter]))
        return meterOrder.map((key) => metersByKey.get(key)).filter((meter): meter is Meter => Boolean(meter))
    }, [meterOrder, meters])
    const visibleMeters = useMemo(
        () =>
            selectedGatewayId === 'all'
                ? orderedMeters
                : orderedMeters.filter((meter) => String(meter.gatewayId) === selectedGatewayId),
        [orderedMeters, selectedGatewayId],
    )

    function persistMeterOrder(nextOrder: string[]) {
        setMeterOrder(nextOrder)
        if (loadedMeterOrder.current) {
            window.localStorage.setItem(METER_ORDER_STORAGE_KEY, JSON.stringify(nextOrder))
        }
    }

    function handleMeterDrop(targetKey: string) {
        if (!draggedMeterKey || draggedMeterKey === targetKey) return
        const visibleKeys = visibleMeters.map(meterKey)
        const sourceIndex = visibleKeys.indexOf(draggedMeterKey)
        const targetIndex = visibleKeys.indexOf(targetKey)
        if (sourceIndex < 0 || targetIndex < 0) return

        const reorderedVisibleKeys = [...visibleKeys]
        reorderedVisibleKeys.splice(sourceIndex, 1)
        reorderedVisibleKeys.splice(targetIndex, 0, draggedMeterKey)
        const visibleKeySet = new Set(visibleKeys)
        let visibleIndex = 0
        const nextOrder = meterOrder.map((key) => {
            if (!visibleKeySet.has(key)) return key
            return reorderedVisibleKeys[visibleIndex++]
        })
        persistMeterOrder(nextOrder)
    }
    const isReloading =
        gatewaysQuery.isFetching ||
        metersQuery.isFetching ||
        activePowerQuery.isFetching ||
        cloudTargetsQuery.isFetching

    async function refetchAll() {
        await Promise.all([
            gatewaysQuery.refetch(),
            metersQuery.refetch(),
            activePowerQuery.refetch(),
            cloudTargetsQuery.refetch(),
        ])
    }

    useEffect(() => {
        const id = setInterval(refetchAll, OVERVIEW_REFETCH_TIME)
        return () => clearInterval(id)
    }, [])

    const enabledGateways = gateways.filter((gateway) => getGatewayStatus(gateway) === 'online').length
    const enabledCloudTargets = cloudTargets.filter((target) => target.enabled).length
    const realtimePending = cloudTargets.reduce((sum, target) => sum + (target.realtimePending ?? 0), 0)
    const gatewayNames = new Map(gateways.map((gateway) => [gateway.id, getGatewayDisplayName(gateway, t)]))
    const selectedGateway = gateways.find((gateway) => String(gateway.id) === selectedGatewayId)
    return (
        <div className='flex h-full min-h-0 flex-col gap-4'>
            <div className='sticky top-0 z-10 flex shrink-0 flex-col gap-4 bg-[#F7F5F0] pb-1'>
                <div className='flex items-center justify-between'>
                    <h1 className='text-3xl font-bold tracking-tight'>{t('overview.title')}</h1>
                    <button
                        type='button'
                        onClick={refetchAll}
                        disabled={isReloading}
                        className='flex items-center gap-2 border border-[#BFC8C2] bg-transparent px-3 py-1 text-sm font-medium hover:bg-white disabled:opacity-60'>
                        <RefreshCw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
                        {t('overview.refresh')}
                    </button>
                </div>

                <section className='grid grid-cols-2 border border-[#D8DDD9] bg-white md:grid-cols-5'>
                    <Summary
                        label={t('overview.gatewayOnline')}
                        value={enabledGateways}
                        suffix={`/ ${gateways.length}`}
                    />
                    <Summary
                        label={t('overview.cloudOnline')}
                        value={enabledCloudTargets}
                        suffix={`/ ${cloudTargets.length}`}
                    />
                    <Summary label={t('overview.meterCount')} value={meters.length} />
                    <Summary label={t('overview.uploaded')} value={uploadedToday} />
                    <Summary label={t('overview.realtimePending')} value={realtimePending} />
                </section>
            </div>

            <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6'>
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
                                    const status = getGatewayStatus(gateway)
                                    const style = STATUS_STYLE[status]
                                    return (
                                        <div key={gateway.id} className='flex items-center gap-4 p-4'>
                                            <StatusDot status={status} />
                                            <div className='min-w-0 flex-1'>
                                                <p className='font-semibold'>{getGatewayDisplayName(gateway, t)}</p>
                                                <p className='text-xs text-[#7B8580]'>
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
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm ${style.badgeBg} ${style.badgeText}`}>
                                                {status === 'online'
                                                    ? t('overview.online')
                                                    : status === 'offline'
                                                        ? t('common.offline')
                                                        : t('common.disabled')}
                                            </span>
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
                                cloudTargets.map((target) => {
                                    const status =
                                        target.connectionStatus === 'offline'
                                            ? 'offline'
                                            : !target.enabled
                                                ? 'disabled'
                                                : 'online'
                                    return (
                                        <div key={target.id} className='flex items-center gap-4 p-4'>
                                            <StatusDot status={status} />
                                            <div className='min-w-0 flex-1'>
                                                <p className='font-semibold'>{target.name}</p>
                                                <p className='truncate text-xs text-[#7B8580]'>{target.apiKey}</p>
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
                                                    <p>
                                                        {t('overview.realtimePending')}: {target.realtimePending ?? 0}
                                                    </p>
                                                    <p>
                                                        {target.backfill
                                                            ? ` · ${t('overview.backfill')}: ${target.backfill.createdCount}/${target.backfill.estimatedTotalCount}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </OverviewSection>
                </div>

                <OverviewSection
                    title={t('overview.meterStatus')}
                    href='/meters'
                    action={t('common.settings')}
                    canManage={canManage}
                    titleExtra={
                        <Select value={selectedGatewayId} onValueChange={setSelectedGatewayId}>
                            <SelectTrigger
                                aria-label={t('overview.gatewayFilter')}
                                className='h-9 min-w-0 max-w-48 bg-white text-sm font-normal'>
                                <SelectValue>
                                    {selectedGateway ? getGatewayDisplayName(selectedGateway, t) : t('overview.allGateways')}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='all'>{t('overview.allGateways')}</SelectItem>
                                {gateways.map((gateway) => (
                                    <SelectItem key={gateway.id} value={String(gateway.id)}>
                                        {getGatewayDisplayName(gateway, t)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                    className='shrink-0'>
                    <div className='grid gap-5 grid-cols-1 lg:grid-cols-2'>
                        {visibleMeters.length === 0 ? (
                            <div className='border border-[#D8DDD9] bg-white'>
                                <EmptyState text={t('overview.noMeters')} />
                            </div>
                        ) : (
                            visibleMeters.map((meter: Meter) => {
                                const meterID = meter.meterId ?? meter.macId
                                const overviewData = activePowerByMeter[`${meter.gatewayId}:${meterID}`]

                                const gateway = gateways.find((gateway) => gateway.id === meter.gatewayId)
                                const gatewayStatus = gateway ? getGatewayStatus(gateway) : 'offline'
                                const meterStatus = getMeterStatus(meter)

                                const status =
                                    gatewayStatus === 'disabled'
                                        ? 'disabled'
                                        : gatewayStatus === 'offline'
                                            ? 'offline'
                                            : meterStatus
                                const style = STATUS_STYLE[status]
                                return (
                                    <div
                                        key={`${meter.gatewayId}:${meterID}`}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => handleMeterDrop(meterKey(meter))}
                                        className={`border-t-4 ${style.border} flex flex-col gap-3 border-x border-b border-[#D8DDD9] bg-white p-4 ${draggedMeterKey === meterKey(meter) ? 'opacity-50' : ''}`}
                                    >
                                        <div className='flex items-start justify-between gap-3'>
                                            <div className='flex items-center gap-3'>
                                                <StatusDot status={status} />
                                                <div>
                                                    <div className='flex gap-2 items-center'>
                                                        <p
                                                            draggable
                                                            onDragStart={() => setDraggedMeterKey(meterKey(meter))}
                                                            onDragEnd={() => setDraggedMeterKey(null)}
                                                            className='cursor-grab font-semibold active:cursor-grabbing'>
                                                            {meter.name || meterID}
                                                        </p>
                                                        <p className='text-sm font-semibold'>
                                                            ({transformPhaseMode(meter.phaseMode)})
                                                        </p>
                                                        <p className='text-xs text-[#7B8580] mt-0.5'>{meter.macId}</p>
                                                    </div>
                                                    <p className='text-xs text-[#7B8580]'>
                                                        {gatewayNames.get(meter.gatewayId) ?? '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm ${style.badgeBg} ${style.badgeText}`}>
                                                {status === 'online'
                                                    ? t('overview.online')
                                                    : status === 'offline'
                                                        ? t('common.offline')
                                                        : t('common.disabled')}
                                            </span>
                                        </div>
                                        <div className='grid grid-cols-2 gap-1 border-y border-[#E4E8E5] py-2 text-sm sm:grid-cols-5'>
                                            <Metric
                                                label={t('overview.voltage')}
                                                value={formatValue(overviewData?.voltage, ' V')}
                                            />
                                            <Metric
                                                label={t('overview.averageCurrent')}
                                                value={formatValue(
                                                    getAverageCurrent(overviewData, meter.phaseMode),
                                                    ' A',
                                                )}
                                            />
                                            <Metric label='L1' value={formatValue(overviewData?.l1, ' A')} />
                                            <Metric
                                                label='L2'
                                                value={formatValue(overviewData?.l2, ' A',)}
                                            />
                                            <Metric
                                                label='L3'
                                                value={formatValue(overviewData?.l3, ' A',)}
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <p className='text-xs text-[#8A938E]'>{t('overview.activePower')}</p>
                                            <MeterSparkline
                                                points={overviewData?.activePower ?? []}
                                                loading={activePowerQuery.isLoading}
                                                rangeEnd={activePowerQuery.dataUpdatedAt}
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
        </div>
    )
}
