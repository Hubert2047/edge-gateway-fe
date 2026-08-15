'use client'

import { useState, useSyncExternalStore } from 'react'
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
import type { CloudTarget, CloudTargetFormValues, CloudTargetListResponse } from '@/types/cloud-target'
import { getErrorMessage } from '@/lib/utils'
import { ClientRelativeTime } from './client-relative-time'
import { StatusBadge } from '../status-badge'
import {
    useCloudTargets,
    useCreateCloudTarget,
    useDeleteCloudTarget,
    useFlushAllCloudTargets,
    useFlushCloudTarget,
    useTestCloudTargetConnection,
    useUpdateCloudTarget,
} from '@/lib/api/cloud-target'
import { mapCloudTargetError, useI18n } from '@/lib/i18n'

function emptyForm(): CloudTargetFormValues {
    return {
        name: '',
        apiBaseUrl: 'https://api.mmold.com',
        apiKey: '',
        apiSecret: '',
        uploadIntervalSec: 60,
        uploadBatchSize: 100,
        flushPauseMs: 100,
        enabled: false,
        backfillEnabled: false,
        backfillFromTs: '',
        backfillToTs: '',
    }
}

function targetToForm(target: CloudTarget): CloudTargetFormValues {
    return {
        id: target.id,
        name: target.name ?? '',
        apiBaseUrl: target.apiBaseUrl ?? '',
        apiKey: target.apiKey ?? '',
        apiSecret: target.apiSecretMasked ?? '',
        uploadIntervalSec: target.uploadIntervalSec ?? 0,
        uploadBatchSize: target.uploadBatchSize ?? 100,
        flushPauseMs: target.flushPauseMs ?? 100,
        enabled: target.enabled ?? false,
    }
}

type FormErrors = Partial<
    Record<
        | 'name'
        | 'apiBaseUrl'
        | 'apiKey'
        | 'cloudServerSecret'
        | 'uploadIntervalSec'
        | 'uploadBatchSize'
        | 'backfillFromTs'
        | 'backfillToTs',
        string
    >
>

function validateForm(form: CloudTargetFormValues): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'validation.displayNameRequired'
    if (!form.apiBaseUrl.trim()) errors.apiBaseUrl = 'validation.urlRequired'
    if (!form.apiKey.trim()) errors.apiKey = 'validation.cloudIdRequired'
    if (!form.apiSecret.trim()) errors.cloudServerSecret = 'validation.secretRequired'
    if (!form.uploadIntervalSec || form.uploadIntervalSec <= 0)
        errors.uploadIntervalSec = 'validation.intervalInvalid'
    if (!form.uploadBatchSize || form.uploadBatchSize < 1 || form.uploadBatchSize > 500)
        errors.uploadBatchSize = 'validation.batchSizeInvalid'
    if (form.backfillEnabled) {
        if (!form.backfillFromTs) errors.backfillFromTs = 'validation.backfillStartRequired'
        if (!form.backfillToTs) errors.backfillToTs = 'validation.backfillEndRequired'
        if (form.backfillFromTs && form.backfillToTs) {
            const from = new Date(`${form.backfillFromTs}T00:00:00`)
            const to = new Date(`${form.backfillToTs}T00:00:00`)
            const earliest = new Date()
            earliest.setMonth(earliest.getMonth() - 12)
            earliest.setHours(0, 0, 0, 0)
            if (from < earliest) errors.backfillFromTs = 'validation.backfillDateTooOld'
            if (to < earliest) errors.backfillToTs = 'validation.backfillDateTooOld'
            if (to <= from) errors.backfillToTs = 'validation.backfillEndAfterStart'
            const maxTo = new Date(from)
            maxTo.setMonth(maxTo.getMonth() + 12)
            if (to > maxTo) errors.backfillToTs = 'validation.backfillRangeTooLong'
        }
    }
    return errors
}

function toBackfillTimestamp(value: string, isEnd: boolean) {
    const date = new Date(`${value}T00:00:00`)
    if (isEnd) {
        date.setDate(date.getDate() + 1)
        const now = new Date()
        if (date > now) date.setTime(now.getTime())
    }
    const pad = (number: number) => String(number).padStart(2, '0')
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const absoluteOffset = Math.abs(offsetMinutes)
    const offset = `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
}

function todayDateInput() {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
}

function earliestDateInput() {
    const date = new Date()
    date.setMonth(date.getMonth() - 12)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

type PendingAction = {
    type: 'save' | 'delete' | 'flush'
    id: string
    name: string
} | { type: 'flushAll'; name: string } | null
type TestResult = { success: boolean; message?: string }
type RowFormState = { form: CloudTargetFormValues; errors: FormErrors }

const emptySubscribe = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function CloudTargetList({ initialTargets }: { initialTargets: CloudTargetListResponse }) {
    const { t, locale } = useI18n()
    const { data: cloudTargetList = initialTargets, refetch } = useCloudTargets(initialTargets, { refetchInterval: false })
    const targets = cloudTargetList.targets
    const canCreateCloudTarget = targets.length < cloudTargetList.cloudTargetMax
    const updateMutation = useUpdateCloudTarget()
    const deleteMutation = useDeleteCloudTarget()
    const createMutation = useCreateCloudTarget()
    const testMutation = useTestCloudTargetConnection()
    const flushAllMutation = useFlushAllCloudTargets()
    const flushMutation = useFlushCloudTarget()

    const [rowFormState, setRowFormState] = useState<Record<string, RowFormState>>({})
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
    const earliestBackfillDate = isHydrated ? earliestDateInput() : undefined
    const latestBackfillDate = isHydrated ? todayDateInput() : undefined

    function getRowForm(target: CloudTarget): RowFormState {
        return rowFormState[target.id] ?? { form: targetToForm(target), errors: {} }
    }

    function updateRowForm(id: string, patch: Partial<CloudTargetFormValues>) {
        setRowFormState((prev) => {
            const current = prev[id]?.form ?? targetToForm(targets.find((t) => t.id === id)!)
            const prevErrors = prev[id]?.errors ?? {}
            const nextErrors = { ...prevErrors }
            for (const key of Object.keys(patch)) {
                delete nextErrors[key as keyof FormErrors]
            }
            return { ...prev, [id]: { form: { ...current, ...patch }, errors: nextErrors } }
        })
    }

    function clearRowForm(id: string) {
        setRowFormState((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }

    const [newForm, setNewForm] = useState(emptyForm())
    const [newErrors, setNewErrors] = useState<FormErrors>({})
    function updateNewForm(patch: Partial<CloudTargetFormValues>) {
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

    function toggleEnabled(target: CloudTarget, checked: boolean) {
        if (checked && target.connectionStatus !== 'online') {
            toast.error(t('toast.cloudTestRequired'))
            return
        }

        const { form } = getRowForm(target)
        updateMutation.mutate(
            { id: target.id, form: { ...form, enabled: checked } },
            {
                onError: (err) => toast.error(mapCloudTargetError(err, t, t('toast.statusFailed'))),
            },
        )
        clearRowForm(target.id)
    }

    function requestSave(target: CloudTarget) {
        const { form } = getRowForm(target)
        const errors = validateForm(form)
        if (Object.keys(errors).length > 0) {
            setRowFormState((prev) => ({ ...prev, [target.id]: { form, errors } }))
            return
        }

        setPendingAction({ type: 'save', id: target.id, name: form.name || target.id })
    }

    function requestDelete(target: CloudTarget) {
        const { form } = getRowForm(target)
        setPendingAction({ type: 'delete', id: target.id, name: form.name || target.id })
    }

    function confirmPendingAction() {
        if (!pendingAction) return
        const { type } = pendingAction
        setPendingAction(null)

        if (type === 'flushAll') {
            flushAllMutation.mutate(undefined, {
                onSuccess: () => toast.success(t('toast.flushStarted')),
                onError: (err) => toast.error(mapCloudTargetError(err, t, t('toast.flushFailed'))),
            })
            return
        }

        if (type === 'flush') {
            const id = String(pendingAction.id)
            flushMutation.mutate(id, {
                onSuccess: () => toast.success(t('toast.flushStarted')),
                onError: (err) => toast.error(mapCloudTargetError(err, t, t('toast.flushFailed'))),
            })
            return
        }

        const { id } = pendingAction
        const target = targets.find((t) => t.id === id)
        if (!target) return

        if (type === 'save') {
            const { form } = getRowForm(target)
            updateMutation.mutate(
                { id, form },
                {
                    onSuccess: () => clearRowForm(id),
                    onError: (err) => toast.error(mapCloudTargetError(err, t, t('toast.saveFailed'))),
                },
            )
        }
        if (type === 'delete') {
            setDeletingId(id)
            deleteMutation.mutate(id, {
                onSettled: () => setDeletingId((prev) => (prev === id ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, t('toast.deleteFailed'))),
            })
        }
    }

    function runTestConnection(id: string) {
        setTestResults((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        testMutation.mutate(id, {
            onSuccess: (result) => {
                setTestResults((prev) => ({ ...prev, [id]: result }))
                if (!result.success) {
                    toast.error(
                        mapCloudTargetError(
                            new Error(result.message ?? ''),
                            t,
                            t('toast.connectionFailed'),
                        ),
                    )
                }
                void refetch()
            },
            onError: (err) => {
                const message = mapCloudTargetError(err, t, t('toast.connectionFailed'))
                toast.error(message)
                setTestResults((prev) => ({ ...prev, [id]: { success: false, message } }))
            },
        })
    }

    function createTarget() {
        const errors = validateForm(newForm)
        if (Object.keys(errors).length > 0) {
            setNewErrors(errors)
            return
        }

        const form = { ...newForm }
        if (form.backfillEnabled) {
            form.backfillFromTs = toBackfillTimestamp(form.backfillFromTs!, false)
            form.backfillToTs = toBackfillTimestamp(form.backfillToTs!, true)
        } else {
            delete form.backfillFromTs
            delete form.backfillToTs
        }

        createMutation.mutate(form, {
            onSuccess: () => {
                setNewForm(emptyForm())
                setNewErrors({})
                toast.success(t('toast.added'))
            },
            onError: (err) => toast.error(mapCloudTargetError(err, t, t('toast.addFailed'))),
        })
    }

    function runQueuedUploads() {
        setPendingAction({ type: 'flushAll', name: t('page.cloudSync') })
    }

    function requestFlush(target: CloudTarget) {
        setPendingAction({ type: 'flush', id: target.id, name: target.name })
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: { title: t('common.confirmDelete'), desc: (name: string) => t('common.confirmDeleteDescription', { name }) },
        flush: { title: t('cloud.confirmFlush'), desc: (name: string) => t('cloud.confirmFlushDescription', { name }) },
        flushAll: { title: t('cloud.confirmFlushAll'), desc: () => t('cloud.confirmFlushAllDescription') },
    } as const

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <div className='flex shrink-0 items-center justify-between gap-3 max-sm:items-start max-sm:flex-col'>
                <h1 className='md:text-3xl font-bold'>{t('page.cloudSync')}</h1>
                <Button
                    className='max-sm:w-full'
                    disabled={flushAllMutation.isPending}
                    onClick={runQueuedUploads}>
                    {flushAllMutation.isPending ? (
                        <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('cloud.running')}
                        </>
                    ) : (
                        t('cloud.runQueue')
                    )}
                </Button>
            </div>

            <Card className='flex flex-1 min-h-0 flex-col overflow-hidden border border-border/60 pt-0 max-md:flex-none max-md:overflow-visible'>
                <div className='flex-1 min-h-0 overflow-y-auto max-md:overflow-visible'>
                    <table className='responsive-table w-full text-sm'>
                        <colgroup>
                            <col className='w-28' />
                            <col className='min-w-72' />
                            <col className='w-72 xl:w-96' />
                            <col className='w-28' />
                        </colgroup>
                        <thead className='bg-muted text-left sticky top-0 z-10'>
                            <tr>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.status')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('cloud.server')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.settings')}</th>
                                <th className='whitespace-nowrap px-4 py-1.5'>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        data-label={t('cloud.server')}
                                        className='p-6 text-center text-sm text-muted-foreground'>
                                        {t('empty.noCloudTargets')}
                                    </td>
                                </tr>
                            ) : (
                                targets.map((target) => {
                                    const { form, errors } = getRowForm(target)
                                    const saving =
                                        updateMutation.isPending && updateMutation.variables?.id === target.id
                                    const testing = testMutation.isPending && testMutation.variables === target.id
                                    const flushing =
                                        flushMutation.isPending &&
                                        String(flushMutation.variables) === String(target.id)
                                    const deleting = deletingId === target.id
                                    const rowBusy = saving || deleting
                                    const testResult = testResults[target.id]
                                    const status =
                                        target.connectionStatus === "offline"
                                            ? 'offline'
                                            : !target.enabled
                                                ? 'disabled'
                                                : "online"
                                    return (
                                        <tr
                                            key={target.id}
                                            className={`relative border-t align-top transition-colors ${rowBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                                            <td data-label={t('common.status')} className='p-4 space-y-2'>
                                                <Checkbox
                                                    checked={form.enabled}
                                                    disabled={rowBusy}
                                                    onCheckedChange={(checked) =>
                                                        toggleEnabled(target, checked === true)
                                                    }
                                                />
                                                <StatusBadge status={status} />
                                            </td>
                                            <td data-label={t('cloud.server')} className='p-4 space-y-3'>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`name-${target.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('common.displayName')}
                                                    </Label>
                                                    <Input
                                                        id={`name-${target.id}`}
                                                        value={form.name}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(target.id, { name: e.target.value })
                                                        }
                                                        className={errors.name ? 'border-destructive' : ''}
                                                    />
                                                    {errors.name && (
                                                        <p className='text-xs text-destructive'>{t(errors.name)}</p>
                                                    )}
                                                </div>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`serverid-${target.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('cloud.server')}
                                                    </Label>
                                                    <Input
                                                        id={`serverid-${target.id}`}
                                                        className={`font-mono ${errors.apiKey ? 'border-destructive' : ''}`}
                                                        value={form.apiKey}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(target.id, { apiKey: e.target.value })
                                                        }
                                                    />
                                                    {errors.apiKey && (
                                                        <p className='text-xs text-destructive'>{t(errors.apiKey)}</p>
                                                    )}
                                                </div>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`secret-${target.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('cloud.secret')}
                                                    </Label>
                                                    <Input
                                                        id={`secret-${target.id}`}
                                                        className={errors.cloudServerSecret ? 'border-destructive' : ''}
                                                        value={form.apiSecret}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(target.id, {
                                                                apiSecret: e.target.value,
                                                            })
                                                        }
                                                    />
                                                    {errors.cloudServerSecret && (
                                                        <p className='text-xs text-destructive'>
                                                            {t(errors.cloudServerSecret)}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label={t('common.settings')} className='p-4 space-y-3'>
                                                <div className='space-y-1.5'>
                                                    <Label
                                                        htmlFor={`url-${target.id}`}
                                                        className='text-xs text-muted-foreground'>
                                                        {t('cloud.apiBaseUrl')}
                                                    </Label>
                                                    <Input
                                                        id={`url-${target.id}`}
                                                        value={form.apiBaseUrl}
                                                        disabled={rowBusy}
                                                        onChange={(e) =>
                                                            updateRowForm(target.id, { apiBaseUrl: e.target.value })
                                                        }
                                                        className={errors.apiBaseUrl ? 'border-destructive' : ''}
                                                    />
                                                    {errors.apiBaseUrl && (
                                                        <p className='text-xs text-destructive'>{t(errors.apiBaseUrl)}</p>
                                                    )}
                                                </div>
                                                <div className='flex flex-wrap items-start gap-x-2 gap-y-3'>
                                                    <div className='w-[9rem] shrink-0 space-y-1.5'>
                                                        <Label
                                                            htmlFor={`interval-${target.id}`}
                                                            className='whitespace-nowrap text-xs text-muted-foreground'>
                                                            {t('cloud.uploadInterval')}
                                                        </Label>
                                                        <div className='flex items-center gap-1'>
                                                            <Input
                                                                id={`interval-${target.id}`}
                                                                type='number'
                                                                value={form.uploadIntervalSec}
                                                                disabled={rowBusy}
                                                                onChange={(e) =>
                                                                    updateRowForm(target.id, {
                                                                        uploadIntervalSec: Number(e.target.value),
                                                                    })
                                                                }
                                                                className={
                                                                    errors.uploadIntervalSec
                                                                        ? 'border-destructive'
                                                                        : 'w-16'
                                                                }
                                                            />
                                                            <span className='text-xs text-muted-foreground'>{t('common.seconds')}</span>
                                                        </div>
                                                        {errors.uploadIntervalSec && (
                                                            <p className='text-xs text-destructive'>
                                                                {t(errors.uploadIntervalSec)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className='w-[8.5rem] shrink-0 space-y-1.5'>
                                                        <Label
                                                            htmlFor={`batch-size-${target.id}`}
                                                            className='whitespace-nowrap text-xs text-muted-foreground'>
                                                            {t('cloud.uploadBatchSize')}
                                                        </Label>
                                                        <Input
                                                            id={`batch-size-${target.id}`}
                                                            type='number'
                                                            min={1}
                                                            max={500}
                                                            value={form.uploadBatchSize}
                                                            disabled={rowBusy}
                                                            onChange={(e) =>
                                                                updateRowForm(target.id, {
                                                                    uploadBatchSize: Number(e.target.value),
                                                                })
                                                            }
                                                            className={errors.uploadBatchSize ? 'border-destructive' : 'w-20'}
                                                        />
                                                        {errors.uploadBatchSize && (
                                                            <p className='text-xs text-destructive'>{t(errors.uploadBatchSize)}</p>
                                                        )}
                                                    </div>
                                                    <div className='min-w-[14rem] flex-1 space-y-1 pt-1 text-xs text-muted-foreground'>
                                                        <div className='flex gap-4'>
                                                            <p className='leading-snug'>{t('cloud.lastUpload')}</p>
                                                            <p className='font-bold'>
                                                                <ClientRelativeTime
                                                                    value={target.lastUploadAt}
                                                                    locale={locale}
                                                                    fallback={String(t('cloud.notUploaded'))}
                                                                />
                                                            </p>
                                                        </div>
                                                        <div className='flex gap-4'>
                                                            <p>{t('cloud.realtimePending')}</p>
                                                            <p className='font-bold'>
                                                                {typeof target.realtimePending === 'number'
                                                                    ? target.realtimePending
                                                                    : 0}
                                                            </p>
                                                        </div>
                                                        {target.backfill ? (
                                                            <div className='mt-2 min-w-48'>
                                                                <div className='flex justify-between text-xs'>
                                                                    <span>{t('cloud.backfillProgress')}</span>
                                                                    <span className='font-bold'>
                                                                        {target.backfill.createdCount} / {target.backfill.estimatedTotalCount}
                                                                    </span>
                                                                </div>
                                                                <div className='mt-1 h-1.5 overflow-hidden rounded bg-[#E5EAE6]'>
                                                                    <div
                                                                        className='h-full bg-[#64BD91]'
                                                                        style={{
                                                                            width: `${target.backfill.estimatedTotalCount > 0 ? Math.min(100, (target.backfill.createdCount / target.backfill.estimatedTotalCount) * 100) : 0}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                                                <div className='flex flex-col items-center gap-1.5'>
                                                    <Button
                                                        size='sm'
                                                        className='w-20'
                                                        disabled={saving || testing}
                                                        onClick={() => requestSave(target)}>
                                                        {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='secondary'
                                                        className='w-20 border bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
                                                        disabled={testing}
                                                        onClick={() => runTestConnection(target.id)}>
                                                        {testing ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('cloud.testConnection')
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        className='w-20'
                                                        disabled={flushing || !form.enabled}
                                                        onClick={() => requestFlush(target)}>
                                                        {flushing ? t('cloud.runningProcess') : t('cloud.flush')}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        className='w-20 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                                        variant='ghost'
                                                        disabled={deleting}
                                                        onClick={() => requestDelete(target)}>
                                                        {deleting ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('common.delete')
                                                        )}
                                                    </Button>
                                                    {testResult && (
                                                        <p
                                                            className={`text-xs ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {testResult.success
                                                                ? t('cloud.success')
                                                                : t('cloud.failure')}
                                                        </p>
                                                    )}
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

            {canCreateCloudTarget && <Card className='flex flex-col gap-3 relative shrink-0 px-4 sm:px-6 pt-4 space-y-4'>
                {createMutation.isPending && (
                    <div className='absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60'>
                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                    </div>
                )}
                <h2 className='text-lg font-medium mb-0 font-bold'>{t('cloud.add')}</h2>
                <div className='rounded-lg border border-border/60 bg-muted/30 p-2 mb-0'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
                        <div className='flex items-center gap-3 lg:min-w-64'>
                            <Checkbox
                                id='new-backfill-enabled'
                                checked={newForm.backfillEnabled === true}
                                disabled={createMutation.isPending}
                                onCheckedChange={(checked) => updateNewForm({ backfillEnabled: checked === true })}
                            />
                            <Label htmlFor='new-backfill-enabled' className='font-medium'>
                                {t('cloud.backfillEnabled')}
                            </Label>
                        </div>
                        {newForm.backfillEnabled && (
                            <div className='flex flex-1 flex-col gap-4 sm:flex-row'>
                                <div className='w-full space-y-1.5 sm:w-48'>
                                    <Label htmlFor='new-backfill-start' className='text-xs text-muted-foreground'>
                                        {t('cloud.backfillStart')}
                                    </Label>
                                    <Input
                                        id='new-backfill-start'
                                        type='date'
                                        value={newForm.backfillFromTs ?? ''}
                                        min={earliestBackfillDate}
                                        max={newForm.backfillToTs || latestBackfillDate}
                                        disabled={createMutation.isPending}
                                        onChange={(e) => updateNewForm({ backfillFromTs: e.target.value })}
                                        className={newErrors.backfillFromTs ? 'border-destructive' : ''}
                                    />
                                    {newErrors.backfillFromTs && (
                                        <p className='text-xs text-destructive'>{t(newErrors.backfillFromTs)}</p>
                                    )}
                                </div>
                                <div className='w-full space-y-1.5 sm:w-48'>
                                    <Label htmlFor='new-backfill-end' className='text-xs text-muted-foreground'>
                                        {t('cloud.backfillEnd')}
                                    </Label>
                                    <Input
                                        id='new-backfill-end'
                                        type='date'
                                        value={newForm.backfillToTs ?? ''}
                                        min={newForm.backfillFromTs || earliestBackfillDate}
                                        max={latestBackfillDate}
                                        disabled={createMutation.isPending}
                                        onChange={(e) => updateNewForm({ backfillToTs: e.target.value })}
                                        className={newErrors.backfillToTs ? 'border-destructive' : ''}
                                    />
                                    {newErrors.backfillToTs && (
                                        <p className='text-xs text-destructive'>{t(newErrors.backfillToTs)}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className='grid grid-cols-1 gap-4 mb-0 sm:grid-cols-2 xl:grid-cols-4'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-name' className='text-xs text-muted-foreground'>
                            {t('common.displayName')}
                        </Label>
                        <Input
                            id='new-name'
                            placeholder={t('cloud.namePlaceholder')}
                            value={newForm.name}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ name: e.target.value })}
                            className={`w-full ${newErrors.name ? 'border-destructive' : ''}`}
                        />
                        {newErrors.name && <p className='text-xs text-destructive'>{t(newErrors.name)}</p>}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-url' className='text-xs text-muted-foreground'>
                            {t('cloud.apiBaseUrl')}
                        </Label>
                        <Input
                            id='new-url'
                            placeholder={t('cloud.urlPlaceholder')}
                            value={newForm.apiBaseUrl}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ apiBaseUrl: e.target.value })}
                            className={`w-full ${newErrors.apiBaseUrl ? 'border-destructive' : ''}`}
                        />
                        {newErrors.apiBaseUrl && <p className='text-xs text-destructive'>{t(newErrors.apiBaseUrl)}</p>}
                    </div>
                </div>
                <div className='grid grid-cols-1 gap-4 mb-0 sm:grid-cols-2 xl:grid-cols-4'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-serverid' className='text-xs text-muted-foreground'>
                            {t('cloud.id')}
                        </Label>
                        <Input
                            id='new-serverid'
                            className={`w-full font-mono ${newErrors.apiKey ? 'border-destructive' : ''}`}
                            value={newForm.apiKey}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ apiKey: e.target.value })}
                        />
                        {newErrors.apiKey && <p className='text-xs text-destructive'>{t(newErrors.apiKey)}</p>}
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='new-secret' className='text-xs text-muted-foreground'>
                            {t('cloud.secret')}
                        </Label>
                        <Input
                            id='new-secret'
                            type='password'
                            className={`w-full ${newErrors.cloudServerSecret ? 'border-destructive' : ''}`}
                            value={newForm.apiSecret}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ apiSecret: e.target.value })}
                        />
                        {newErrors.cloudServerSecret && (
                            <p className='text-xs text-destructive'>{t(newErrors.cloudServerSecret)}</p>
                        )}
                    </div>

                    <div className='xl:col-span-2 flex gap-2'>
                        <div className='space-y-1.5'>
                            <Label htmlFor='new-interval' className='text-xs text-muted-foreground'>
                                {t('cloud.uploadInterval')}
                            </Label>
                            <Input
                                id='new-interval'
                                type='number'
                                placeholder='60'
                                value={newForm.uploadIntervalSec}
                                disabled={createMutation.isPending}
                                onChange={(e) => updateNewForm({ uploadIntervalSec: Number(e.target.value) })}
                                className={`w-24 ${newErrors.uploadIntervalSec ? 'border-destructive' : ''}`}
                            />
                            {newErrors.uploadIntervalSec && (
                                <p className='text-xs text-destructive'>{t(newErrors.uploadIntervalSec)}</p>
                            )}
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='new-batch-size' className='text-xs text-muted-foreground'>
                                {t('cloud.uploadBatchSize')}
                            </Label>
                            <Input
                                id='new-batch-size'
                                type='number'
                                min={1}
                                max={500}
                                placeholder='100'
                                value={newForm.uploadBatchSize}
                                disabled={createMutation.isPending}
                                onChange={(e) => updateNewForm({ uploadBatchSize: Number(e.target.value) })}
                                className={`w-28 ${newErrors.uploadBatchSize ? 'border-destructive' : ''}`}
                            />
                            {newErrors.uploadBatchSize && (
                                <p className='text-xs text-destructive'>{t(newErrors.uploadBatchSize)}</p>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    disabled={createMutation.isPending}
                    onClick={createTarget}
                    size='lg'
                    className='w-full sm:w-max'>
                    {createMutation.isPending ? (
                        <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('common.adding')}
                        </>
                    ) : (
                        t('common.add')
                    )}
                </Button>
            </Card>}

            <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{pendingAction ? dialogText[pendingAction.type].title : ''}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingAction ? dialogText[pendingAction.type].desc(pendingAction.name) : ''}
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
