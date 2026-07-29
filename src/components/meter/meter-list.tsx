'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Meter, MeterFormValues, MeterType } from '@/types/meter'
import { getErrorMessage } from '@/lib/utils'
import { StatusBadge } from '../status-badge'
import { useCreateMeter, useDeleteMeter, useMeters, useUpdateMeter, useUpdateMetersBulk } from '@/lib/api/meter'
import { useI18n } from '@/lib/i18n'

function emptyForm(): MeterFormValues {
    return {
        macId: '',
        name: '',
        measurementType: 'three_phase',
        voltage: 220,
        powerFactor: 0.9,
    }
}

function meterToForm(meter: Meter): MeterFormValues {
    return {
        macId: meter.macId,
        name: meter.name ?? '',
        measurementType: meter.measurementType,
        voltage: meter.voltage,
        powerFactor: meter.powerFactor,
    }
}

type FormErrors = Partial<Record<'name' | 'macId' | 'voltage' | 'powerFactor', string>>

function validateForm(form: MeterFormValues, opts: { isNew: boolean }): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'validation.nameRequired'
    if (opts.isNew && !form.macId.trim()) errors.macId = 'validation.macRequired'
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

export function MeterList({ hubUid, initialMeters }: { hubUid: string; initialMeters?: Meter[] }) {
    const { t } = useI18n()
    const { data: meters = initialMeters ?? [], isFetching } = useMeters(hubUid, initialMeters)
    const updateMeterMutation = useUpdateMeter(hubUid)
    const deleteMeterMutation = useDeleteMeter(hubUid)
    const createMeterMutation = useCreateMeter(hubUid)
    const bulkMutation = useUpdateMetersBulk(hubUid)

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

    const [newForm, setNewForm] = useState(emptyForm())
    const [newErrors, setNewErrors] = useState<FormErrors>({})

    function updateNewForm(patch: Partial<MeterFormValues>) {
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

    useEffect(() => {
        setRowFormState({})
        setNewForm(emptyForm())
        setNewErrors({})
        setPendingAction(null)
        setDeletingMacId(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hubUid])

    function toggleEnabled(meter: Meter, checked: boolean) {
        updateMeterMutation.mutate(
            {
                macId: meter.macId,
                name: meter.name ?? '',
                measurementType: meter.measurementType,
                voltage: meter.voltage,
                powerFactor: meter.powerFactor,
                enabled: checked,
            },
            { onError: (err) => toast.error(getErrorMessage(err, t('toast.statusFailed'))) },
        )
    }

    function requestSave(meter: Meter) {
        const { form } = getRowForm(meter)
        const errors = validateForm(form, { isNew: false })
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
        const dirtyMacIds = Object.keys(rowFormState)
        if (dirtyMacIds.length === 0) return

        let hasError = false
        setRowFormState((prev) => {
            const next = { ...prev }
            for (const macId of dirtyMacIds) {
                const errors = validateForm(next[macId].form, { isNew: false })
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
            const { macId, ...payload } = form
            updateMeterMutation.mutate(
                { macId: action.macId, ...payload, enabled: meter.enabled },
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
                    const { macId: _, ...form } = rowFormState[macId].form
                    return { macId, ...form, enabled: meter.enabled }
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

    function createMeter() {
        const errors = validateForm(newForm, { isNew: true })
        if (Object.keys(errors).length > 0) {
            setNewErrors(errors)
            return
        }
        createMeterMutation.mutate(
            { ...newForm, meterType: newForm.measurementType },
            {
                onSuccess: () => {
                    setNewForm(emptyForm())
                    setNewErrors({})
                    toast.success(t('toast.added'))
                },
                onError: (err) => toast.error(getErrorMessage(err, t('toast.addFailed'))),
            },
        )
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: { title: t('common.confirmDelete'), desc: (name: string) => t('common.confirmDeleteDescription', { name }) },
        saveAll: { title: t('meter.confirmSaveAll'), desc: (name: string) => t('meter.confirmSaveAllDescription', { name }) },
    } as const

    const dirtyCount = Object.keys(rowFormState).length

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <Card className='shrink-0 px-4 sm:px-6 pt-4 space-y-4'>
                <div className='flex items-center justify-between mb-0'>
                    <h2 className='text-lg font-bold'>{t('meter.add')}</h2>
                    <span className='text-sm text-muted-foreground flex items-center gap-1.5'>
                        {isFetching && <Loader2 className='h-3 w-3 animate-spin' />}
                        {t('meter.count', { count: meters.length })}
                    </span>
                </div>
                <div className='flex flex-wrap items-start gap-4'>
                    <div className='w-full space-y-1.5 sm:w-52'>
                        <Label htmlFor='new-name' className='text-xs text-muted-foreground'>
                            {t('common.name')}
                        </Label>
                        <Input
                            id='new-name'
                            placeholder={t('meter.namePlaceholder')}
                            value={newForm.name}
                            onChange={(e) => updateNewForm({ name: e.target.value })}
                            className={newErrors.name ? 'border-destructive' : ''}
                        />
                        {newErrors.name && <p className='text-xs text-destructive'>{t(newErrors.name)}</p>}
                    </div>
                    <div className='w-full space-y-1.5 sm:w-60'>
                        <Label htmlFor='new-mac' className='text-xs text-muted-foreground'>
                            {t('meter.macId')}
                        </Label>
                        <Input
                            id='new-mac'
                            placeholder={t('meter.macPlaceholder')}
                            value={newForm.macId}
                            onChange={(e) => updateNewForm({ macId: e.target.value })}
                            className={newErrors.macId ? 'border-destructive' : ''}
                        />
                        {newErrors.macId && <p className='text-xs text-destructive'>{t(newErrors.macId)}</p>}
                    </div>
                    <div className='w-full space-y-1.5 sm:w-28'>
                        <Label className='text-xs text-muted-foreground'>{t('meter.phase')}</Label>
                        <Select
                            value={newForm.measurementType}
                            onValueChange={(v) => {
                                if (!v) return
                                updateNewForm({ measurementType: v as MeterType })
                            }}>
                            <SelectTrigger>
                                <SelectValue>{newForm.measurementType === 'three_phase' ? t('meter.threePhase') : t('meter.singlePhase')}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='three_phase'>{t('meter.threePhase')}</SelectItem>
                                <SelectItem value='single_phase'>{t('meter.singlePhase')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='w-full space-y-1.5 sm:w-32'>
                        <Label htmlFor='new-voltage' className='text-xs text-muted-foreground'>
                            {t('meter.voltage')}
                        </Label>
                        <Input
                            id='new-voltage'
                            type='number'
                            value={newForm.voltage}
                            onChange={(e) => updateNewForm({ voltage: Number(e.target.value) })}
                            className={newErrors.voltage ? 'border-destructive' : ''}
                        />
                        {newErrors.voltage && <p className='text-xs text-destructive'>{t(newErrors.voltage)}</p>}
                    </div>
                    <div className='w-full space-y-1.5 sm:w-28'>
                        <Label htmlFor='new-pf' className='text-xs text-muted-foreground'>
                            {t('meter.powerFactor')}
                        </Label>
                        <Input
                            id='new-pf'
                            type='number'
                            step='0.01'
                            value={newForm.powerFactor}
                            onChange={(e) => updateNewForm({ powerFactor: Number(e.target.value) })}
                            className={newErrors.powerFactor ? 'border-destructive' : ''}
                        />
                        {newErrors.powerFactor && <p className='text-xs text-destructive'>{t(newErrors.powerFactor)}</p>}
                    </div>
                    <Button
                        disabled={createMeterMutation.isPending}
                        onClick={createMeter}
                        size='lg'
                        className='w-full sm:mt-5 sm:w-max'
                    >
                        {createMeterMutation.isPending ? (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('common.adding')}
                            </>
                        ) : (
                            t('common.add')
                        )}
                    </Button>
                </div>
            </Card>
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
                    className={`flex-1 min-h-0 overflow-y-auto transition-opacity duration-200 ${
                        isFetching ? 'opacity-60' : 'opacity-100'
                    } max-md:overflow-visible`}>
                    <table className='responsive-table w-full text-sm'>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='p-4'>{t('meter.tableName')}</th>
                                <th className='p-4'>{t('meter.macId')}</th>
                                <th className='p-4'>{t('meter.phase')}</th>
                                <th className='p-4'>{t('meter.voltage')}</th>
                                <th className='p-4'>{t('meter.powerFactor')}</th>
                                <th className='p-4'>{t('common.status')}</th>
                                <th className='p-4'>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meters.map((meter) => {
                                const { form, errors } = getRowForm(meter)
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
                                            <p className='text-sm font-mono text-foreground/80'>{meter.macId}</p>
                                        </td>
                                        <td data-label={t('meter.phase')} className='p-2'>
                                            <Select
                                                value={form.measurementType}
                                                disabled={rowBusy}
                                                onValueChange={(v) => {
                                                    if (!v) return
                                                    updateRowForm(meter.macId, { measurementType: v as MeterType })
                                                }}>
                                                <SelectTrigger>
                                                <SelectValue>{form.measurementType === 'three_phase' ? t('meter.threePhase') : t('meter.singlePhase')}</SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value='three_phase'>{t('meter.threePhase')}</SelectItem>
                                                    <SelectItem value='single_phase'>{t('meter.singlePhase')}</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                        <td data-label={t('common.status')} className='p-2 space-y-2 flex align-items gap-2'>
                                            <Checkbox
                                                checked={meter.enabled}
                                                disabled={rowBusy}
                                                onCheckedChange={(checked) => toggleEnabled(meter, checked === true)}
                                            />
                                            <StatusBadge enabled={meter.enabled} activeLabel={t('common.enabled')} />
                                        </td>
                                        <td data-label={t('common.actions')} data-role='actions' className='p-2'>
                                            <div className='flex items-end gap-1.5'>
                                                <Button
                                                    size='sm'
                                                    className='w-16'
                                                    disabled={rowBusy}
                                                    onClick={() => requestSave(meter)}>
                                                    {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    className='w-16 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                                    variant='ghost'
                                                    disabled={rowBusy}
                                                    onClick={() => requestDelete(meter)}>
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
