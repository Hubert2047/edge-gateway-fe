'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import type { Meter, MeterBatchUpdateValues, MeterFormValues, PhaseMode } from '@/types/meter'
import type { Gateway } from '@/types/gateway'
import { getErrorMessage } from '@/lib/utils'
import { StatusBadge } from '../status-badge'
import { useDeleteMeter, useMeters, useUpdateMeter, useUpdateMetersBulk } from '@/lib/api/meter'
import { useI18n } from '@/lib/i18n'
import { GatewaySwitcher } from './gateway-switcher'

function toBatchUpdate(meter: Meter, form: MeterFormValues): MeterBatchUpdateValues {
    return {
        ...form,
        meterId: meter.meterId,
        gatewayUID: meter.gatewayUID,
        meterType: meter.meterType,
        connectionType: meter.connectionType,
        config: meter.config,
        note: meter.note,
    }
}

function meterToForm(meter: Meter): MeterFormValues {
    return {
        macId: meter.macId,
        name: meter.name ?? '',
        phaseMode: meter.phaseMode,
        voltage: meter.voltage,
        powerFactor: meter.powerFactor,
        enabled: meter.enabled,
    }
}

function isMeterFormDirty(meter: Meter, form: MeterFormValues): boolean {
    const current = meterToForm(meter)
    return (
        form.macId !== current.macId ||
        form.name !== current.name ||
        form.phaseMode !== current.phaseMode ||
        form.voltage !== current.voltage ||
        form.powerFactor !== current.powerFactor ||
        form.enabled !== current.enabled
    )
}

type FormErrors = Partial<Record<'name' | 'phaseMode' | 'voltage' | 'powerFactor', string>>

function validateForm(form: MeterFormValues, meterType: string): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'validation.nameRequired'
    if (meterType === '513' && form.phaseMode === 'three_phase') {
        errors.phaseMode = 'validation.phaseMode513Invalid'
    }
    if (!form.voltage || form.voltage <= 0) errors.voltage = 'validation.voltageInvalid'
    if (!form.powerFactor || form.powerFactor <= 0 || form.powerFactor > 1) {
        errors.powerFactor = 'validation.powerFactorInvalid'
    }
    return errors
}

type PendingAction =
    | { type: 'save'; macId: string; displayName: string }
    | { type: 'delete'; macId: string; displayName: string }
    | { type: 'saveAll'; macIds: string[]; displayName: string }
    | null

type RowFormState = { form: MeterFormValues; errors: FormErrors }

export function MeterList({
    gateways: gateways,
    gatewayUid: gatewayUid,
    initialMeters,
    onHubChange,
}: {
    gateways: Gateway[]
    gatewayUid: string
    initialMeters?: Meter[]
    onHubChange: (gatewayUid: string) => void
}) {
    const { t } = useI18n()
    const { data: meters = initialMeters ?? [], isFetching } = useMeters(gatewayUid, initialMeters)
    const updateMeterMutation = useUpdateMeter(gatewayUid)
    const deleteMeterMutation = useDeleteMeter(gatewayUid)
    const bulkMutation = useUpdateMetersBulk(gatewayUid)

    const [rowFormState, setRowFormState] = useState<Record<string, RowFormState>>({})
    const [deletingMacId, setDeletingMacId] = useState<string | null>(null)

    function getRowForm(meter: Meter): RowFormState {
        return rowFormState[meter.macId] ?? { form: meterToForm(meter), errors: {} }
    }

    function updateRowForm(macId: string, patch: Partial<MeterFormValues>) {
        setRowFormState((prev) => {
            const current = prev[macId]?.form ?? meterToForm(meters.find((m) => m.macId === macId)!)
            const prevErrors = prev[macId]?.errors ?? {}
            const nextErrors = { ...prevErrors }
            for (const key of Object.keys(patch)) {
                delete nextErrors[key as keyof FormErrors]
            }
            return { ...prev, [macId]: { form: { ...current, ...patch }, errors: nextErrors } }
        })
    }

    function clearRowForm(macId: string) {
        setRowFormState((prev) => {
            const next = { ...prev }
            delete next[macId]
            return next
        })
    }

    function getDirtyMacIds() {
        return Object.keys(rowFormState).filter((macId) => {
            const meter = meters.find((item) => item.macId === macId)
            const row = rowFormState[macId]
            return meter !== undefined && isMeterFormDirty(meter, row.form)
        })
    }

    const [pendingAction, setPendingAction] = useState<PendingAction>(null)

    function requestSave(meter: Meter) {
        const { form } = getRowForm(meter)
        if (!isMeterFormDirty(meter, form)) return
        const errors = validateForm(form, meter.meterType)
        if (Object.keys(errors).length > 0) {
            setRowFormState((prev) => ({ ...prev, [meter.macId]: { form, errors } }))
            return
        }
        setPendingAction({ type: 'save', macId: meter.macId, displayName: form.name || meter.macId })
    }

    function requestDelete(meter: Meter) {
        const { form } = getRowForm(meter)
        setPendingAction({ type: 'delete', macId: meter.macId, displayName: form.name || meter.macId })
    }

    function requestSaveAll() {
        const dirtyMacIds = getDirtyMacIds()
        if (dirtyMacIds.length === 0) return

        let hasError = false
        setRowFormState((prev) => {
            const next = { ...prev }
            for (const macId of dirtyMacIds) {
                const meter = meters.find((item) => item.macId === macId)
                const errors = meter ? validateForm(next[macId].form, meter.meterType) : {}
                if (Object.keys(errors).length > 0) hasError = true
                next[macId] = { ...next[macId], errors }
            }
            return next
        })
        if (hasError) return

        setPendingAction({
            type: 'saveAll',
            macIds: dirtyMacIds,
            displayName: t('meter.unsaved', { count: dirtyMacIds.length }),
        })
    }

    async function confirmPendingAction() {
        if (!pendingAction) return
        const action = pendingAction
        setPendingAction(null)

        if (action.type === 'save') {
            const meter = meters.find((m) => m.macId === action.macId)
            if (!meter) return
            const { form } = getRowForm(meter)
            updateMeterMutation.mutate(
                toBatchUpdate(meter, form),
                {
                    onSuccess: () => clearRowForm(action.macId),
                    onError: (err) => toast.error(getErrorMessage(err, t('toast.saveFailed'))),
                },
            )
        }

        if (action.type === 'delete') {
            setDeletingMacId(action.macId)
            deleteMeterMutation.mutate(action.macId, {
                onSettled: () => setDeletingMacId((prev) => (prev === action.macId ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, t('toast.deleteFailed'))),
            })
        }

        if (action.type === 'saveAll') {
            const updates = action.macIds
                .map((macId) => {
                    const meter = meters.find((m) => m.macId === macId)
                    if (!meter) return null
                    const form = rowFormState[macId].form
                    return toBatchUpdate(meter, form)
                })
                .filter((u): u is NonNullable<typeof u> => u !== null)

            const result = await bulkMutation.mutateAsync(updates)
            if (result.failed.length === 0) {
                for (const macId of action.macIds) clearRowForm(macId)
                toast.success(t('meter.saved', { count: result.succeeded.length }))
            } else {
                for (const macId of result.succeeded) clearRowForm(macId)
                toast.error(t('meter.partialSaved', { success: result.succeeded.length, failure: result.failed.length }))
            }
        }
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: { title: t('common.confirmDelete'), desc: (name: string) => t('common.confirmDeleteDescription', { name }) },
        saveAll: { title: t('meter.confirmSaveAll'), desc: (name: string) => t('meter.confirmSaveAllDescription', { name }) },
    } as const

    const dirtyMacIds = getDirtyMacIds()
    const dirtyCount = dirtyMacIds.length

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <div className='flex shrink-0 items-center justify-between gap-4 max-sm:flex-wrap'>
                <h1 className='text-xl font-bold sm:text-3xl'>{t('page.meters')}</h1>
                <div className='flex items-center gap-3 max-sm:w-full max-sm:justify-between'>
                    <GatewaySwitcher gateways={gateways} currentGatewayUid={gatewayUid} onGatewayChange={onHubChange} />
                    <span className='flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground'>
                        {isFetching && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                        {t('gateway.meterCount', { count: meters.length })}
                    </span>
                </div>
            </div>
            <Card className='flex flex-1 min-h-0 flex-col overflow-hidden border border-border/60 pt-0 max-md:flex-none max-md:overflow-visible'>
                <div className='flex items-center justify-between border-b px-4 py-3'>
                    <span className='text-sm text-muted-foreground'>
                        {dirtyCount > 0 ? t('meter.unsaved', { count: dirtyCount }) : t('meter.allSaved')}
                    </span>
                    <Button size='sm' disabled={dirtyCount === 0 || bulkMutation.isPending} onClick={requestSaveAll}>
                        {bulkMutation.isPending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            t('meter.saveAll', { count: dirtyCount })
                        )}
                    </Button>
                </div>
                <div
                    className={`flex-1 min-h-0 overflow-y-auto transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'
                        } max-md:overflow-visible`}>
                    <table className='responsive-table w-full table-fixed text-sm'>
                        <colgroup>
                            <col className='w-[16%]' />
                            <col className='w-[19%]' />
                            <col className='w-[11%]' />
                            <col className='w-[12%]' />
                            <col className='w-[12%]' />
                            <col className='w-[11%]' />
                            <col className='w-[18%]' />
                        </colgroup>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('meter.tableName')}</th>
                                <th className='px-4 py-2 min-w-48 whitespace-nowrap'>{t('meter.macId')}</th>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('meter.phase')}</th>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('meter.voltage')}</th>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('meter.powerFactor')}</th>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('common.status')}</th>
                                <th className='px-4 py-2 whitespace-nowrap'>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meters.map((meter) => {
                                const { form, errors } = getRowForm(meter)
                                const dirty = isMeterFormDirty(meter, form)
                                const saving =
                                    updateMeterMutation.isPending &&
                                    updateMeterMutation.variables?.macId === meter.macId
                                const deleting = deletingMacId === meter.macId
                                const rowBusy = saving || deleting || bulkMutation.isPending || isFetching
                                return (
                                    <tr
                                        key={meter.macId}
                                        className={`border-t align-top transition-colors ${rowBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <td data-label={t('common.name')} className='p-2'>
                                            <Input
                                                value={form.name}
                                                disabled={rowBusy}
                                                onChange={(e) => updateRowForm(meter.macId, { name: e.target.value })}
                                                className={errors.name ? 'border-destructive' : ''}
                                            />
                                            {errors.name && (
                                                <p className='text-xs text-destructive mt-1'>{t(errors.name)}</p>
                                            )}
                                        </td>
                                        <td data-label='MAC ID' className='p-2'>
                                            <Input
                                                value={form.macId}
                                                disabled
                                                className='font-mono'
                                            />
                                        </td>
                                        <td data-label={t('meter.phase')} className='p-2'>
                                            <Select
                                                value={form.phaseMode}
                                                disabled={rowBusy}
                                                onValueChange={(v) => {
                                                    if (!v) return
                                                    updateRowForm(meter.macId, { phaseMode: v as PhaseMode })
                                                }}>
                                                <SelectTrigger>
                                                    <SelectValue>
                                                        {form.phaseMode === 'three_phase'
                                                            ? t('meter.threePhase')
                                                            : form.phaseMode === 'three_phase_balanced'
                                                                ? t('meter.threePhaseBalanced')
                                                                : t('meter.singlePhase')}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {meter.meterType !== '513' && (
                                                        <SelectItem value='three_phase'>{t('meter.threePhase')}</SelectItem>
                                                    )}
                                                    <SelectItem value='three_phase_balanced'>{t('meter.threePhaseBalanced')}</SelectItem>
                                                    <SelectItem value='single_phase'>{t('meter.singlePhase')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.phaseMode && (
                                                <p className='text-xs text-destructive mt-1'>{t(errors.phaseMode)}</p>
                                            )}
                                        </td>
                                        <td data-label={t('meter.voltage')} className='p-2'>
                                            <Input
                                                type='number'
                                                value={form.voltage}
                                                disabled={rowBusy}
                                                onChange={(e) =>
                                                    updateRowForm(meter.macId, { voltage: Number(e.target.value) })
                                                }
                                                className={errors.voltage ? 'border-destructive' : ''}
                                            />
                                            {errors.voltage && (
                                                <p className='text-xs text-destructive mt-1'>{t(errors.voltage)}</p>
                                            )}
                                        </td>
                                        <td data-label={t('meter.powerFactor')} className='p-2'>
                                            <Input
                                                type='number'
                                                step='0.01'
                                                value={form.powerFactor}
                                                disabled={rowBusy}
                                                onChange={(e) =>
                                                    updateRowForm(meter.macId, { powerFactor: Number(e.target.value) })
                                                }
                                                className={errors.powerFactor ? 'border-destructive' : ''}
                                            />
                                            {errors.powerFactor && (
                                                <p className='text-xs text-destructive mt-1'>{t(errors.powerFactor)}</p>
                                            )}
                                        </td>
                                        <td data-label={t('common.status')} className='pt-3 px-2 space-y-2 flex items-center gap-2'>
                                            <Checkbox
                                                className='mb-0'
                                                checked={form.enabled}
                                                disabled={rowBusy}
                                                onCheckedChange={(checked) =>
                                                    updateRowForm(meter.macId, { enabled: checked === true })
                                                }
                                            />
                                            {!form.enabled ? (
                                                <StatusBadge enabled={false} activeLabel={t('common.enabled')} />
                                            ) : meter.isOnline ?? false ? (
                                                <StatusBadge enabled={true} activeLabel={t('gateway.monitoring')} />
                                            ) : (
                                                <span className='inline-flex items-center rounded-md bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600 border border-rose-200'>
                                                    {t('common.offline')}
                                                </span>
                                            )}
                                        </td>
                                        <td data-label={t('common.actions')} data-role='actions' className='p-2'>
                                            <div className='flex items-end gap-1.5'>
                                                <Button
                                                    size='sm'
                                                    className='w-16'
                                                    disabled={rowBusy || !dirty}
                                                    onClick={() => requestSave(meter)}>
                                                    {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}
                                                </Button>
                                                {/* <Button
                                                    size='sm'
                                                    className='w-16 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                                    variant='ghost'
                                                    disabled={rowBusy}
                                                    onClick={() => requestDelete(meter)}>
                                                    {deleting ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.delete')}
                                                </Button> */}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
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
