'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Gateway, GatewayFormValues } from '@/types/gateway'
import { getErrorMessage, getGatewayStatus } from '@/lib/utils'
import { StatusBadge } from '../status-badge'
import {
    useCreateGateway,
    useDeleteGateway,
    useGateways,
    useSyncGatewayMeters,
    useUpdateGateway,
} from '@/lib/api/gateway'
import { RelativeTime } from '../RelativeTime'
import { useI18n } from '@/lib/i18n'
import { VirtualGatewayRow } from './virtual-gateway-row'

function emptyForm(): GatewayFormValues {
    return {
        name: '',
        ip: '192.168.1.100',
        port: 10123,
        enabled: true,
        pollIntervalSeconds: 60,
        note: '',
    }
}

function gatewayToForm(gateway: Gateway): GatewayFormValues {
    return {
        name: gateway.name,
        ip: gateway.ip,
        port: gateway.port,
        enabled: gateway.enabled,
        pollIntervalSeconds: gateway.pollIntervalSeconds,
        note: gateway.note,
    }
}

type FormErrors = Partial<Record<'name' | 'ip' | 'port' | 'pollIntervalSeconds', string>>

function validateForm(form: GatewayFormValues): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'validation.displayNameRequired'
    if (!form.ip.trim()) errors.ip = 'validation.ipRequired'
    if (!form.port || form.port <= 0) errors.port = 'validation.portInvalid'
    if (!form.pollIntervalSeconds || form.pollIntervalSeconds <= 0)
        errors.pollIntervalSeconds = 'validation.intervalInvalid'
    return errors
}

type PendingAction = { type: 'save' | 'delete' | 'collect'; id: number; displayName: string } | null
type RowFormState = { form: GatewayFormValues; errors: FormErrors }

export function GatewayList({ initialGateways: initialGateways }: { initialGateways: Gateway[] }) {
    const { t } = useI18n()
    const { data: gateways = initialGateways } = useGateways(initialGateways)
    const updateGatewayMutation = useUpdateGateway()
    const deleteGatewayMutation = useDeleteGateway()
    const createGatewayMutation = useCreateGateway()
    const syncGatewayMetersMutation = useSyncGatewayMeters()
    const [rowFormState, setRowFormState] = useState<Record<string, RowFormState>>({})
    const [collectingIds, setCollectingIds] = useState<Set<number>>(new Set())

    // ---- "connecting" state after turning a gateway on ----
    // Simple rule: mark pending immediately when the user flips the switch on,
    // clear it as soon as the polled data confirms online (or gets disabled),
    // and always clear it with a hard timeout so it can never spin forever.
    const [pendingEnableIds, setPendingEnableIds] = useState<Set<number>>(new Set())
    const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    function clearPendingEnable(id: number) {
        if (pendingTimers.current[id]) {
            clearTimeout(pendingTimers.current[id])
            delete pendingTimers.current[id]
        }
        setPendingEnableIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    function markPendingEnable(id: number, pollIntervalSeconds: number) {
        setPendingEnableIds((prev) => new Set(prev).add(id))
        if (pendingTimers.current[id]) clearTimeout(pendingTimers.current[id])
        const maxWaitMs = Math.max(pollIntervalSeconds, 5) * 1000 + 5000
        pendingTimers.current[id] = setTimeout(() => clearPendingEnable(id), maxWaitMs)
    }

    // Clear pending as soon as polled data confirms the gateway is online,
    // or if it got disabled again while we were waiting.
    useEffect(() => {
        for (const id of pendingEnableIds) {
            const gw = gateways.find((g) => g.id === id)
            if (!gw || !gw.enabled || gw.isOnline) {
                clearPendingEnable(id)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gateways])

    useEffect(() => {
        return () => {
            Object.values(pendingTimers.current).forEach(clearTimeout)
        }
    }, [])

    function getRowForm(gateway: Gateway): RowFormState {
        return rowFormState[gateway.id] ?? { form: gatewayToForm(gateway), errors: {} }
    }

    function updateRowForm(id: number, patch: Partial<GatewayFormValues>) {
        setRowFormState((prev) => {
            const current = prev[id]?.form ?? gatewayToForm(gateways.find((h) => h.id === id)!)
            const prevErrors = prev[id]?.errors ?? {}
            const nextErrors = { ...prevErrors }
            for (const key of Object.keys(patch)) {
                delete nextErrors[key as keyof FormErrors]
            }
            return { ...prev, [id]: { form: { ...current, ...patch }, errors: nextErrors } }
        })
    }

    function clearRowForm(id: number) {
        setRowFormState((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }

    const [newForm, setNewForm] = useState(emptyForm())
    const [newErrors, setNewErrors] = useState<FormErrors>({})

    function updateNewForm(patch: Partial<GatewayFormValues>) {
        setNewForm((f) => ({ ...f, ...patch }))
        setNewErrors((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(patch)) {
                delete next[key as keyof FormErrors]
            }
            return next
        })
    }

    const [pendingAction, setPendingAction] = useState<PendingAction>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    function toggleEnabled(gateway: Gateway, checked: boolean) {
        const { form } = getRowForm(gateway)

        if (checked) {
            markPendingEnable(gateway.id, gateway.pollIntervalSeconds)
        } else {
            clearPendingEnable(gateway.id)
        }

        updateGatewayMutation.mutate(
            { id: gateway.id, form: { ...form, enabled: checked } },
            {
                onError: () => clearPendingEnable(gateway.id),
            },
        )
        clearRowForm(gateway.id)
    }

    function requestSave(gateway: Gateway) {
        const { form } = getRowForm(gateway)
        const errors = validateForm(form)
        if (Object.keys(errors).length > 0) {
            setRowFormState((prev) => ({ ...prev, [gateway.id]: { form, errors } }))
            return
        }

        setPendingAction({ type: 'save', id: gateway.id, displayName: form.name || String(gateway.id) })
    }

    function requestDelete(gateway: Gateway) {
        const { form } = getRowForm(gateway)
        setPendingAction({ type: 'delete', id: gateway.id, displayName: form.name || String(gateway.id) })
    }

    function requestCollect(gateway: Gateway) {
        const { form } = getRowForm(gateway)
        setPendingAction({ type: 'collect', id: gateway.id, displayName: form.name || String(gateway.id) })
    }

    async function confirmPendingAction() {
        if (!pendingAction) return
        const { type, id } = pendingAction
        setPendingAction(null)
        const gateway = gateways.find((h) => h.id === id)
        if (!gateway) return

        if (type === 'save') {
            const { form } = getRowForm(gateway)
            updateGatewayMutation.mutate(
                { id, form },
                {
                    onSuccess: () => clearRowForm(id),
                    onError: (err) => toast.error(getErrorMessage(err, t('toast.saveFailed'))),
                },
            )
        }

        if (type === 'delete') {
            setDeletingId(id)
            deleteGatewayMutation.mutate(id, {
                onSettled: () => setDeletingId((prev) => (prev === id ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, t('toast.deleteFailed'))),
            })
        }

        if (type === 'collect') {
            setCollectingIds((prev) => new Set(prev).add(id))
            syncGatewayMetersMutation.mutate(id, {
                onError: (err) => toast.error(getErrorMessage(err, t('toast.collectFailed'))),
                onSettled: () => {
                    setCollectingIds((prev) => {
                        const next = new Set(prev)
                        next.delete(id)
                        return next
                    })
                },
            })
        }
    }

    function createGateway() {
        const errors = validateForm(newForm)
        if (Object.keys(errors).length > 0) {
            setNewErrors(errors)
            return
        }

        createGatewayMutation.mutate(newForm, {
            onSuccess: () => {
                setNewForm(emptyForm())
                setNewErrors({})
                toast.success(t('toast.added'))
            },
            onError: (err) => toast.error(t(getErrorMessage(err, 'toast.addFailed'))),
        })
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: {
            title: t('common.confirmDelete'),
            desc: (name: string) => t('common.confirmDeleteDescription', { name }),
        },
        collect: {
            title: t('common.confirmCollect'),
            desc: (name: string) => t('common.confirmCollectDescription', { name }),
        },
    } as const

    const virtualGateway = gateways.find((gateway) => gateway.isVirtual)
    const physicalGateways = gateways.filter((gateway) => !gateway.isVirtual)
    const hasGateways = gateways.length > 0

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <Card className='flex flex-1 min-h-0 flex-col overflow-hidden border border-border/60 pt-0 max-md:flex-none max-md:overflow-visible'>
                <div
                    className={`flex-1 min-h-0 overflow-y-auto ${!hasGateways ? 'max-md:overflow-x-auto' : 'max-md:overflow-visible'
                        }`}>
                    <table
                        className={`responsive-table w-full text-sm ${!hasGateways ? 'responsive-table-empty min-w-[36rem]' : ''
                            }`}>
                        <colgroup>
                            <col className='w-28' />
                            <col className='min-w-72' />
                            <col className='min-w-42 xl:w-72' />
                            <col className='w-28' />
                        </colgroup>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.status')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.gateway')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.settings')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {virtualGateway && <VirtualGatewayRow gateway={virtualGateway} />}
                            {!hasGateways ? (
                                <tr>
                                    <td colSpan={4} className='p-6 text-center text-sm text-muted-foreground'>
                                        {t('empty.noGateways')}
                                    </td>
                                </tr>
                            ) : (
                                physicalGateways.map((gateway) => {
                                    const { form, errors } = getRowForm(gateway)
                                    const saving =
                                        updateGatewayMutation.isPending &&
                                        updateGatewayMutation.variables?.id === gateway.id
                                    const collecting = collectingIds.has(gateway.id)
                                    const deleting = deletingId === gateway.id
                                    const rowBusy = saving || collecting || deleting
                                    const connecting = form.enabled && pendingEnableIds.has(gateway.id)
                                    return (
                                        <tr
                                            key={gateway.id}
                                            className={`border-t align-top transition-colors ${rowBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <td data-label={t('common.status')} className='p-4 space-y-2'>
                                                <Checkbox
                                                    checked={form.enabled}
                                                    disabled={rowBusy}
                                                    onCheckedChange={(checked) =>
                                                        toggleEnabled(gateway, checked === true)
                                                    }
                                                />
                                                <div className='flex items-center gap-2'>
                                                    {connecting ? (
                                                        <>
                                                            <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                                                            <span className='text-xs text-muted-foreground'>
                                                                {t('common.connecting')}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <StatusBadge status={getGatewayStatus(gateway)} />
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label={t('common.gateway')} className='p-4 space-y-3'>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`name-${gateway.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('common.displayName')}
                                                    </Label>
                                                    <Input
                                                        id={`name-${gateway.id}`}
                                                        value={form.name}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(gateway.id, { name: e.target.value })
                                                        }
                                                        className={errors.name ? 'border-destructive' : ''}
                                                    />
                                                    {errors.name && (
                                                        <p className='text-xs text-destructive'>{t(errors.name)}</p>
                                                    )}
                                                </div>
                                                <div className='flex gap-2'>
                                                    <div className='flex-1 space-y-1.5'>
                                                        <Label
                                                            htmlFor={`ip-${gateway.id}`}
                                                            className='text-xs text-muted-foreground'>
                                                            IP
                                                        </Label>
                                                        <Input
                                                            id={`ip-${gateway.id}`}
                                                            value={form.ip}
                                                            disabled={rowBusy}
                                                            onChange={(e) =>
                                                                updateRowForm(gateway.id, { ip: e.target.value })
                                                            }
                                                            className={errors.ip ? 'border-destructive' : ''}
                                                        />
                                                        {errors.ip && (
                                                            <p className='text-xs text-destructive'>{t(errors.ip)}</p>
                                                        )}
                                                    </div>
                                                    <div className='w-28 space-y-1.5'>
                                                        <Label
                                                            htmlFor={`port-${gateway.id}`}
                                                            className='text-xs text-muted-foreground'>
                                                            PORT
                                                        </Label>
                                                        <Input
                                                            id={`port-${gateway.id}`}
                                                            type='number'
                                                            value={form.port}
                                                            disabled={rowBusy}
                                                            onChange={(e) =>
                                                                updateRowForm(gateway.id, {
                                                                    port: Number(e.target.value),
                                                                })
                                                            }
                                                            className={errors.port ? 'border-destructive' : ''}
                                                        />
                                                        {errors.port && (
                                                            <p className='text-xs text-destructive'>{t(errors.port)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`poll-${gateway.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('common.interval')}
                                                    </Label>
                                                    <Input
                                                        id={`poll-${gateway.id}`}
                                                        type='number'
                                                        value={form.pollIntervalSeconds}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(gateway.id, {
                                                                pollIntervalSeconds: Number(e.target.value),
                                                            })
                                                        }
                                                        className={
                                                            errors.pollIntervalSeconds ? 'border-destructive' : ''
                                                        }
                                                    />
                                                    {errors.pollIntervalSeconds && (
                                                        <p className='text-xs text-destructive'>
                                                            {t(errors.pollIntervalSeconds)}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label={t('common.info')} className='p-4 text-muted-foreground'>
                                                <p>{t('gateway.meterCount', { count: gateway.meterCount })}</p>
                                                <p>
                                                    {t('gateway.lastSuccess')}
                                                    <RelativeTime value={gateway.lastSeenAt || gateway.updatedAt} />
                                                </p>
                                            </td>
                                            <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                                                <div className='flex flex-col items-end gap-1.5'>
                                                    <Button
                                                        size='sm'
                                                        className='w-20'
                                                        disabled={rowBusy}
                                                        onClick={() => requestSave(gateway)}>
                                                        {saving ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('common.save')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='secondary'
                                                        disabled={!form.enabled || rowBusy}
                                                        onClick={() => requestCollect(gateway)}
                                                        className={
                                                            form.enabled
                                                                ? 'w-20 border text-emerald-700'
                                                                : 'w-20 border text-muted-foreground'
                                                        }>
                                                        {collecting ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('common.collectNow')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        className='w-20 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                                        variant='ghost'
                                                        disabled={rowBusy}
                                                        onClick={() => requestDelete(gateway)}>
                                                        {deleting ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('common.delete')
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className='shrink-0 px-4 pt-4 space-y-4 sm:px-6'>
                <h2 className='text-lg font-medium mb-0 font-bold'>{t('gateway.add')}</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-0'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-name' className='text-xs text-muted-foreground'>
                            {t('common.displayName')}
                        </Label>
                        <Input
                            id='new-name'
                            disabled={createGatewayMutation.isPending}
                            placeholder={t('gateway.namePlaceholder')}
                            value={newForm.name}
                            onChange={(e) => updateNewForm({ name: e.target.value })}
                            className={newErrors.name ? 'border-destructive' : ''}
                        />
                        {newErrors.name && <p className='text-xs text-destructive'>{t(newErrors.name)}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-ip' className='text-xs text-muted-foreground'>
                            {t('common.ip')}
                        </Label>
                        <Input
                            id='new-ip'
                            disabled={createGatewayMutation.isPending}
                            placeholder={t('gateway.ipPlaceholder')}
                            value={newForm.ip}
                            onChange={(e) => updateNewForm({ ip: e.target.value })}
                            className={newErrors.ip ? 'border-destructive' : ''}
                        />
                        {newErrors.ip && <p className='text-xs text-destructive'>{newErrors.ip}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-port' className='text-xs text-muted-foreground'>
                            {t('common.port')}
                        </Label>
                        <Input
                            id='new-port'
                            disabled={createGatewayMutation.isPending}
                            type='number'
                            placeholder={t('gateway.portPlaceholder')}
                            value={newForm.port}
                            onChange={(e) => updateNewForm({ port: Number(e.target.value) })}
                            className={newErrors.port ? 'border-destructive' : ''}
                        />
                        {newErrors.port && <p className='text-xs text-destructive'>{newErrors.port}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-poll' className='text-xs text-muted-foreground'>
                            {t('common.interval')}
                        </Label>
                        <Input
                            id='new-poll'
                            disabled={createGatewayMutation.isPending}
                            type='number'
                            placeholder={t('gateway.intervalPlaceholder')}
                            value={newForm.pollIntervalSeconds}
                            onChange={(e) => updateNewForm({ pollIntervalSeconds: Number(e.target.value) })}
                            className={newErrors.pollIntervalSeconds ? 'border-destructive' : ''}
                        />
                        {newErrors.pollIntervalSeconds && (
                            <p className='text-xs text-destructive'>{newErrors.pollIntervalSeconds}</p>
                        )}
                    </div>
                </div>
                <Button
                    disabled={createGatewayMutation.isPending}
                    onClick={createGateway}
                    size='lg'
                    className='w-full sm:w-max'>
                    {createGatewayMutation.isPending ? (
                        <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('common.adding')}
                        </>
                    ) : (
                        t('common.add')
                    )}
                </Button>
            </Card>

            <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{pendingAction ? dialogText[pendingAction.type].title : ''}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingAction ? dialogText[pendingAction.type].desc(pendingAction.displayName) : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPendingAction}
                            className={
                                pendingAction?.type === 'delete' ? 'bg-rose-600 text-white hover:bg-rose-700' : ''
                            }>
                            {t('common.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
