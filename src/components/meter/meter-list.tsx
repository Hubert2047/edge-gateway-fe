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

const phaseLabel: Record<MeterType, string> = {
    single_phase: '單相',
    three_phase: '三相',
}

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
    if (!form.name.trim()) errors.name = '請輸入名稱'
    if (opts.isNew && !form.macId.trim()) errors.macId = '請輸入 MAC ID'
    if (!form.voltage || form.voltage <= 0) errors.voltage = '請輸入有效的電壓'
    if (!form.powerFactor || form.powerFactor <= 0 || form.powerFactor > 1) {
        errors.powerFactor = '請輸入 0 ~ 1 之間的功率因數'
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
            { onError: (err) => toast.error(getErrorMessage(err, '更新狀態失敗')) },
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
            displayName: `${dirtyMacIds.length} 筆已修改的智慧勾表`,
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
                    onError: (err) => toast.error(getErrorMessage(err, '儲存失敗')),
                },
            )
        }

        if (action.type === 'delete') {
            setDeletingMacId(action.macId)
            deleteMeterMutation.mutate(action.macId, {
                onSettled: () => setDeletingMacId((prev) => (prev === action.macId ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, '刪除失敗')),
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
                toast.success(`已儲存 ${result.succeeded.length} 筆`)
            } else {
                for (const macId of result.succeeded) clearRowForm(macId)
                toast.error(`成功 ${result.succeeded.length} 筆，失敗 ${result.failed.length} 筆`)
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
                    toast.success('新增成功')
                },
                onError: (err) => toast.error(getErrorMessage(err, '新增失敗')),
            },
        )
    }

    const dialogText = {
        save: { title: '確認儲存', desc: (name: string) => `確定要儲存「${name}」的設定嗎？` },
        delete: { title: '確認刪除', desc: (name: string) => `確定要刪除「${name}」嗎？此操作無法復原。` },
        saveAll: { title: '確認全部儲存', desc: (name: string) => `確定要儲存${name}嗎？` },
    } as const

    const dirtyCount = Object.keys(rowFormState).length

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden'>
            <Card className='shrink-0 px-4 sm:px-6 pt-4 space-y-4'>
                <div className='flex items-center justify-between mb-0'>
                    <h2 className='text-lg font-bold'>新增智慧勾表</h2>
                    <span className='text-sm text-muted-foreground flex items-center gap-1.5'>
                        {isFetching && <Loader2 className='h-3 w-3 animate-spin' />}
                        {meters.length} 個
                    </span>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-0'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-name' className='text-xs text-muted-foreground'>
                            名稱
                        </Label>
                        <Input
                            id='new-name'
                            placeholder='例如：主進線'
                            value={newForm.name}
                            onChange={(e) => updateNewForm({ name: e.target.value })}
                            className={newErrors.name ? 'border-destructive' : ''}
                        />
                        {newErrors.name && <p className='text-xs text-destructive'>{newErrors.name}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-mac' className='text-xs text-muted-foreground'>
                            MAC ID
                        </Label>
                        <Input
                            id='new-mac'
                            placeholder='例如：AA:BB:CC:DD:EE:FF'
                            value={newForm.macId}
                            onChange={(e) => updateNewForm({ macId: e.target.value })}
                            className={newErrors.macId ? 'border-destructive' : ''}
                        />
                        {newErrors.macId && <p className='text-xs text-destructive'>{newErrors.macId}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label className='text-xs text-muted-foreground'>相位型態</Label>
                        <Select
                            value={newForm.measurementType}
                            onValueChange={(v) => {
                                if (!v) return
                                updateNewForm({ measurementType: v as MeterType })
                            }}>
                            <SelectTrigger>
                                <SelectValue>{phaseLabel[newForm.measurementType]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='three_phase'>三相</SelectItem>
                                <SelectItem value='single_phase'>單相</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-voltage' className='text-xs text-muted-foreground'>
                            設定電壓 (V)
                        </Label>
                        <Input
                            id='new-voltage'
                            type='number'
                            value={newForm.voltage}
                            onChange={(e) => updateNewForm({ voltage: Number(e.target.value) })}
                            className={newErrors.voltage ? 'border-destructive' : ''}
                        />
                        {newErrors.voltage && <p className='text-xs text-destructive'>{newErrors.voltage}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-pf' className='text-xs text-muted-foreground'>
                            功率因數
                        </Label>
                        <Input
                            id='new-pf'
                            type='number'
                            step='0.01'
                            value={newForm.powerFactor}
                            onChange={(e) => updateNewForm({ powerFactor: Number(e.target.value) })}
                            className={newErrors.powerFactor ? 'border-destructive' : ''}
                        />
                        {newErrors.powerFactor && <p className='text-xs text-destructive'>{newErrors.powerFactor}</p>}
                    </div>
                </div>
                <Button
                    disabled={createMeterMutation.isPending}
                    onClick={createMeter}
                    size='lg'
                    className='w-full sm:w-max'>
                    {createMeterMutation.isPending ? (
                        <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            新增中...
                        </>
                    ) : (
                        '新增'
                    )}
                </Button>
            </Card>
            <Card className='flex flex-1 min-h-0 flex-col overflow-hidden pt-0 border'>
                <div className='flex items-center justify-between border-b px-4 py-3'>
                    <span className='text-sm text-muted-foreground'>
                        {dirtyCount > 0 ? `${dirtyCount} 筆尚未儲存` : '所有變更已儲存'}
                    </span>
                    <Button size='sm' disabled={dirtyCount === 0 || bulkMutation.isPending} onClick={requestSaveAll}>
                        {bulkMutation.isPending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            `儲存全部 (${dirtyCount})`
                        )}
                    </Button>
                </div>
                <div
                    className={`flex-1 min-h-0 overflow-y-auto transition-opacity duration-200 ${
                        isFetching ? 'opacity-60' : 'opacity-100'
                    }`}>
                    <table className='w-full text-sm'>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='p-4'>智慧勾表名稱</th>
                                <th className='p-4'>MAC ID</th>
                                <th className='p-4'>相位型態</th>
                                <th className='p-4'>設定電壓 (V)</th>
                                <th className='p-4'>功率因數</th>
                                <th className='p-4'>狀態</th>
                                <th className='p-4'>操作</th>
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
                                        <td className='p-2'>
                                            <Input
                                                value={form.name}
                                                disabled={rowBusy}
                                                onChange={(e) => updateRowForm(meter.macId, { name: e.target.value })}
                                                className={errors.name ? 'border-destructive' : ''}
                                            />
                                            {errors.name && (
                                                <p className='text-xs text-destructive mt-1'>{errors.name}</p>
                                            )}
                                        </td>
                                        <td className='p-2'>
                                            <p className='text-sm font-mono text-foreground/80'>{meter.macId}</p>
                                        </td>
                                        <td className='p-2'>
                                            <Select
                                                value={form.measurementType}
                                                disabled={rowBusy}
                                                onValueChange={(v) => {
                                                    if (!v) return
                                                    updateRowForm(meter.macId, { measurementType: v as MeterType })
                                                }}>
                                                <SelectTrigger>
                                                    <SelectValue>{phaseLabel[form.measurementType]}</SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value='three_phase'>三相</SelectItem>
                                                    <SelectItem value='single_phase'>單相</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className='p-2'>
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
                                                <p className='text-xs text-destructive mt-1'>{errors.voltage}</p>
                                            )}
                                        </td>
                                        <td className='p-2'>
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
                                                <p className='text-xs text-destructive mt-1'>{errors.powerFactor}</p>
                                            )}
                                        </td>
                                        <td className='p-2 space-y-2 flex align-items gap-2'>
                                            <Checkbox
                                                checked={meter.enabled}
                                                disabled={rowBusy}
                                                onCheckedChange={(checked) => toggleEnabled(meter, checked === true)}
                                            />
                                            <StatusBadge enabled={meter.enabled} activeLabel='啟用' />
                                        </td>
                                        <td className='p-2'>
                                            <div className='flex items-end gap-1.5'>
                                                <Button
                                                    size='sm'
                                                    className='w-16'
                                                    disabled={rowBusy}
                                                    onClick={() => requestSave(meter)}>
                                                    {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : '儲存'}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    className='w-16 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                                    variant='ghost'
                                                    disabled={rowBusy}
                                                    onClick={() => requestDelete(meter)}>
                                                    {deleting ? <Loader2 className='h-4 w-4 animate-spin' /> : '刪除'}
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
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPendingAction}
                            className={
                                pendingAction?.type === 'delete' ? 'bg-rose-600 text-white hover:bg-rose-700' : ''
                            }>
                            確認
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
