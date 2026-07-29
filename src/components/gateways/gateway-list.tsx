'use client'

import { useState } from 'react'
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
import type { Hub, HubFormValues } from '@/types/hub'
import { getErrorMessage } from '@/lib/utils'
import { StatusBadge } from '../status-badge'
import { useCreateHub, useDeleteHub, useHubs, useSyncHubMeters, useUpdateHub } from '@/lib/api/hub'
import { RelativeTime } from '../RelativeTime'
import { useI18n } from '@/lib/i18n'

function emptyForm(): HubFormValues {
    return {
        uid: '',
        name: '',
        ip: '192.168.1.100',
        port: 10123,
        enabled: true,
        pollIntervalSeconds: 60,
        note: '',
    }
}

function hubToForm(hub: Hub): HubFormValues {
    return {
        uid: hub.uid,
        name: hub.name,
        ip: hub.ip,
        port: hub.port,
        enabled: hub.enabled,
        pollIntervalSeconds: hub.pollIntervalSeconds,
        note: hub.note,
    }
}

type FormErrors = Partial<Record<'hubName' | 'hubIp' | 'hubPort' | 'pollIntervalSeconds', string>>

function validateForm(form: HubFormValues): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.hubName = 'validation.displayNameRequired'
    if (!form.ip.trim()) errors.hubIp = 'validation.ipRequired'
    if (!form.port || form.port <= 0) errors.hubPort = 'validation.portInvalid'
    if (!form.pollIntervalSeconds || form.pollIntervalSeconds <= 0) errors.pollIntervalSeconds = 'validation.intervalInvalid'
    return errors
}

type PendingAction = { type: 'save' | 'delete' | 'collect'; uid: string; displayName: string } | null
type RowFormState = { form: HubFormValues; errors: FormErrors }

export function GatewayList({ initialHubs }: { initialHubs: Hub[] }) {
    const { t } = useI18n()
    const { data: hubs = initialHubs } = useHubs(initialHubs)
    const updateHubMutation = useUpdateHub()
    const deleteHubMutation = useDeleteHub()
    const createHubMutation = useCreateHub()
    const syncHubMetersMutation = useSyncHubMeters()
    const [rowFormState, setRowFormState] = useState<Record<string, RowFormState>>({})
    const [collectingUids, setCollectingUids] = useState<Set<string>>(new Set())

    function getRowForm(hub: Hub): RowFormState {
        return rowFormState[hub.uid] ?? { form: hubToForm(hub), errors: {} }
    }

    function updateRowForm(uid: string, patch: Partial<HubFormValues>) {
        setRowFormState((prev) => {
            const current = prev[uid]?.form ?? hubToForm(hubs.find((h) => h.uid === uid)!)
            const prevErrors = prev[uid]?.errors ?? {}
            const nextErrors = { ...prevErrors }
            for (const key of Object.keys(patch)) {
                delete nextErrors[key as keyof FormErrors]
            }
            return { ...prev, [uid]: { form: { ...current, ...patch }, errors: nextErrors } }
        })
    }

    function clearRowForm(uid: string) {
        setRowFormState((prev) => {
            const next = { ...prev }
            delete next[uid]
            return next
        })
    }

    const [newForm, setNewForm] = useState(emptyForm())
    const [newErrors, setNewErrors] = useState<FormErrors>({})

    function updateNewForm(patch: Partial<HubFormValues>) {
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
    const [deletingUid, setDeletingUid] = useState<string | null>(null)

    function toggleEnabled(hub: Hub, checked: boolean) {
        const { form } = getRowForm(hub)
        updateHubMutation.mutate({ uid: hub.uid, form: { ...form, enabled: checked } })
        clearRowForm(hub.uid)
    }

    function requestSave(hub: Hub) {
        const { form } = getRowForm(hub)
        const errors = validateForm(form)
        if (Object.keys(errors).length > 0) {
            setRowFormState((prev) => ({ ...prev, [hub.uid]: { form, errors } }))
            return
        }

        setPendingAction({ type: 'save', uid: hub.uid, displayName: form.name || hub.uid })
    }

    function requestDelete(hub: Hub) {
        const { form } = getRowForm(hub)
        setPendingAction({ type: 'delete', uid: hub.uid, displayName: form.name || hub.uid })
    }

    function requestCollect(hub: Hub) {
        const { form } = getRowForm(hub)
        setPendingAction({ type: 'collect', uid: hub.uid, displayName: form.name || hub.uid })
    }

    async function confirmPendingAction() {
        if (!pendingAction) return
        const { type, uid } = pendingAction
        setPendingAction(null)
        const hub = hubs.find((h) => h.uid === uid)
        if (!hub) return

        if (type === 'save') {
            const { form } = getRowForm(hub)
            updateHubMutation.mutate(
                { uid, form },
                {
                    onSuccess: () => clearRowForm(uid),
                    onError: (err) => toast.error(getErrorMessage(err, t('toast.saveFailed'))),
                },
            )
        }

        if (type === 'delete') {
            setDeletingUid(uid)
            deleteHubMutation.mutate(uid, {
                onSettled: () => setDeletingUid((prev) => (prev === uid ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, t('toast.deleteFailed'))),
            })
        }

        if (type === 'collect') {
            setCollectingUids((prev) => new Set(prev).add(uid))
            syncHubMetersMutation.mutate(uid, {
                onError: (err) => toast.error(getErrorMessage(err, t('toast.collectFailed'))),
                onSettled: () => {
                    setCollectingUids((prev) => {
                        const next = new Set(prev)
                        next.delete(uid)
                        return next
                    })
                },
            })
        }
    }

    function createHub() {
        const errors = validateForm(newForm)
        if (Object.keys(errors).length > 0) {
            setNewErrors(errors)
            return
        }

        createHubMutation.mutate(newForm, {
            onSuccess: () => {
                setNewForm(emptyForm())
                setNewErrors({})
                toast.success(t('toast.added'))
            },
                onError: (err) => toast.error(getErrorMessage(err, t('toast.addFailed'))),
        })
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: { title: t('common.confirmDelete'), desc: (name: string) => t('common.confirmDeleteDescription', { name }) },
        collect: { title: t('common.confirmCollect'), desc: (name: string) => t('common.confirmCollectDescription', { name }) },
    } as const

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <Card className='flex flex-1 min-h-0 flex-col overflow-hidden border border-border/60 pt-0 max-md:flex-none max-md:overflow-visible'>
                <div
                    className={`flex-1 min-h-0 overflow-y-auto ${
                        hubs.length === 0 ? 'max-md:overflow-x-auto' : 'max-md:overflow-visible'
                    }`}
                >
                    <table
                        className={`responsive-table w-full text-sm ${
                            hubs.length === 0 ? 'responsive-table-empty min-w-[36rem]' : ''
                        }`}
                    >
                        <colgroup>
                            <col className='w-28' />
                            <col className='min-w-72' />
                            <col className='min-w-42 xl:w-72' />
                            <col className='w-28' />
                        </colgroup>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='whitespace-nowrap p-4'>{t('common.status')}</th>
                                <th className='whitespace-nowrap p-4'>{t('common.gateway')}</th>
                                <th className='whitespace-nowrap p-4'>{t('common.settings')}</th>
                                <th className='whitespace-nowrap p-4'>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hubs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className='p-6 text-center text-sm text-muted-foreground'>
                                        {t('empty.noGateways')}
                                    </td>
                                </tr>
                            ) : hubs.map((hub) => {
                                const { form, errors } = getRowForm(hub)
                                const saving =
                                    updateHubMutation.isPending && updateHubMutation.variables?.uid === hub.uid
                                const collecting = collectingUids.has(hub.uid)
                                const deleting = deletingUid === hub.uid
                                const rowBusy = saving || collecting || deleting
                                return (
                                    <tr
                                        key={hub.uid}
                                        className={`border-t align-top transition-colors ${rowBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <td data-label={t('common.status')} className='p-4 space-y-2'>
                                            <Checkbox
                                                checked={form.enabled}
                                                disabled={rowBusy}
                                                onCheckedChange={(checked) => toggleEnabled(hub, checked === true)}
                                            />
                                            <StatusBadge enabled={form.enabled} activeLabel={t('gateway.monitoring')} />
                                        </td>
                                        <td data-label={t('common.gateway')} className='p-4 space-y-3'>
                                            <div className='space-y-1.5'>
                                                <Label className='text-xs text-muted-foreground'>ID</Label>
                                                <p className='text-sm font-mono text-foreground/80'>{hub.uid}</p>
                                            </div>
                                            <div className='space-y-1.5'>
                                                <Label
                                                    htmlFor={`name-${hub.uid}`}
                                                    className='text-xs text-muted-foreground'>
                                                    {t('common.displayName')}
                                                </Label>
                                                <Input
                                                    id={`name-${hub.uid}`}
                                                    value={form.name}
                                                    disabled={rowBusy}
                                                    onChange={(e) => updateRowForm(hub.uid, { name: e.target.value })}
                                                    className={errors.hubName ? 'border-destructive' : ''}
                                                />
                                                {errors.hubName && (
                                                    <p className='text-xs text-destructive'>{t(errors.hubName)}</p>
                                                )}
                                            </div>
                                            <div className='flex gap-2'>
                                                <div className='flex-1 space-y-1.5'>
                                                    <Label
                                                        htmlFor={`ip-${hub.uid}`}
                                                        className='text-xs text-muted-foreground'>
                                                        IP
                                                    </Label>
                                                    <Input
                                                        id={`ip-${hub.uid}`}
                                                        value={form.ip}
                                                        disabled={rowBusy}
                                                        onChange={(e) => updateRowForm(hub.uid, { ip: e.target.value })}
                                                        className={errors.hubIp ? 'border-destructive' : ''}
                                                    />
                                                    {errors.hubIp && (
                                                        <p className='text-xs text-destructive'>{t(errors.hubIp)}</p>
                                                    )}
                                                </div>
                                                <div className='w-28 space-y-1.5'>
                                                    <Label
                                                        htmlFor={`port-${hub.uid}`}
                                                        className='text-xs text-muted-foreground'>
                                                        PORT
                                                    </Label>
                                                    <Input
                                                        id={`port-${hub.uid}`}
                                                        type='number'
                                                        value={form.port}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(hub.uid, { port: Number(e.target.value) })
                                                        }
                                                        className={errors.hubPort ? 'border-destructive' : ''}
                                                    />
                                                    {errors.hubPort && (
                                                        <p className='text-xs text-destructive'>{t(errors.hubPort)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className='space-y-1.5'>
                                                <Label
                                                    htmlFor={`poll-${hub.uid}`}
                                                    className='text-xs text-muted-foreground'>
                                                    {t('common.interval')}
                                                </Label>
                                                <Input
                                                    id={`poll-${hub.uid}`}
                                                    type='number'
                                                    value={form.pollIntervalSeconds}
                                                    disabled={rowBusy}
                                                    onChange={(e) =>
                                                        updateRowForm(hub.uid, {
                                                            pollIntervalSeconds: Number(e.target.value),
                                                        })
                                                    }
                                                    className={errors.pollIntervalSeconds ? 'border-destructive' : ''}
                                                />
                                                {errors.pollIntervalSeconds && (
                                                    <p className='text-xs text-destructive'>
                                                        {t(errors.pollIntervalSeconds)}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label={t('common.info')} className='p-4 text-muted-foreground'>
                                            <p>{t('gateway.meterCount', { count: hub.meterCount })}</p>
                                            <p>
                                                {t('gateway.lastSuccess')}
                                                <RelativeTime value={hub.updatedAt} />
                                            </p>
                                        </td>
                                        <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                                            <div className='flex flex-col items-end gap-1.5'>
                                                <Button
                                                    size='sm'
                                                    className='w-20'
                                                    disabled={rowBusy}
                                                    onClick={() => requestSave(hub)}>
                                                    {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='secondary'
                                                    disabled={!form.enabled || rowBusy}
                                                    onClick={() => requestCollect(hub)}
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
                                                    onClick={() => requestDelete(hub)}>
                                                    {deleting ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.delete')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className='shrink-0 px-4 pt-4 space-y-4 sm:px-6'>
                <h2 className='text-lg font-medium mb-0 font-bold'>{t('gateway.add')}</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-0'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-id' className='text-xs text-muted-foreground'>
                            {t('common.id')}
                        </Label>
                        <Input
                            id='new-id'
                            placeholder={t('gateway.idPlaceholder')}
                            value={newForm.uid}
                            onChange={(e) => updateNewForm({ uid: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-name' className='text-xs text-muted-foreground'>
                            {t('common.displayName')}
                        </Label>
                        <Input
                            id='new-name'
                            placeholder={t('gateway.namePlaceholder')}
                            value={newForm.name}
                            onChange={(e) => updateNewForm({ name: e.target.value })}
                            className={newErrors.hubName ? 'border-destructive' : ''}
                        />
                        {newErrors.hubName && <p className='text-xs text-destructive'>{newErrors.hubName}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-ip' className='text-xs text-muted-foreground'>
                            {t('common.ip')}
                        </Label>
                        <Input
                            id='new-ip'
                            placeholder={t('gateway.ipPlaceholder')}
                            value={newForm.ip}
                            onChange={(e) => updateNewForm({ ip: e.target.value })}
                            className={newErrors.hubIp ? 'border-destructive' : ''}
                        />
                        {newErrors.hubIp && <p className='text-xs text-destructive'>{newErrors.hubIp}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-port' className='text-xs text-muted-foreground'>
                            {t('common.port')}
                        </Label>
                        <Input
                            id='new-port'
                            type='number'
                            placeholder={t('gateway.portPlaceholder')}
                            value={newForm.port}
                            onChange={(e) => updateNewForm({ port: Number(e.target.value) })}
                            className={newErrors.hubPort ? 'border-destructive' : ''}
                        />
                        {newErrors.hubPort && <p className='text-xs text-destructive'>{newErrors.hubPort}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-poll' className='text-xs text-muted-foreground'>
                            {t('common.interval')}
                        </Label>
                        <Input
                            id='new-poll'
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
                {/* <div className="space-y-1.5 mb-0">
                    <Label htmlFor="new-note" className="text-xs text-muted-foreground">{t('common.info')}</Label>
                    <Input
                        id="new-note"
                        placeholder={t('gateway.optional')}
                        value={newForm.note}
                        onChange={(e) => updateNewForm({ note: e.target.value })}
                    />
                </div> */}
                <Button
                    disabled={createHubMutation.isPending}
                    onClick={createHub}
                    size='lg'
                    className='w-full sm:w-max'>
                    {createHubMutation.isPending ? (
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
