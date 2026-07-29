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
import type { CloudTarget, CloudTargetFormValues } from '@/types/cloud-target'
import { formatRelativeTime, getErrorMessage } from '@/lib/utils'
import { StatusBadge } from '../status-badge'
import {
    useCloudTargets,
    useCreateCloudTarget,
    useDeleteCloudTarget,
    useTestCloudTargetConnection,
    useUpdateCloudTarget,
} from '@/lib/api/cloud-target'
import { useI18n } from '@/lib/i18n'

function emptyForm(): CloudTargetFormValues {
    return {
        name: '',
        apiBaseUrl: 'https://api.mmold.com',
        apiKey: '',
        apiSecret: '',
        uploadIntervalSeconds: 60,
        enabled: true,
    }
}

function targetToForm(target: CloudTarget): CloudTargetFormValues {
    return {
        id: target.id,
        name: target.name ?? '',
        apiBaseUrl: target.apiBaseUrl ?? '',
        apiKey: target.apiKey ?? '',
        apiSecret: target.apiSecretMasked ?? '',
        uploadIntervalSeconds: target.uploadIntervalSeconds ?? 0,
        enabled: target.enabled ?? true,
    }
}

type FormErrors = Partial<
    Record<'name' | 'apiBaseUrl' | 'apiKey' | 'cloudServerSecret' | 'uploadIntervalSeconds', string>
>

function validateForm(form: CloudTargetFormValues): FormErrors {
    const errors: FormErrors = {}
    if (!form.name.trim()) errors.name = 'validation.displayNameRequired'
    if (!form.apiBaseUrl.trim()) errors.apiBaseUrl = 'validation.urlRequired'
    if (!form.apiKey.trim()) errors.apiKey = 'validation.cloudIdRequired'
    if (!form.apiSecret.trim()) errors.cloudServerSecret = 'validation.secretRequired'
    if (!form.uploadIntervalSeconds || form.uploadIntervalSeconds <= 0)
        errors.uploadIntervalSeconds = 'validation.intervalInvalid'
    return errors
}

type PendingAction = { type: 'save' | 'delete'; id: string; name: string } | null
type TestResult = { success: boolean; message?: string }
type RowFormState = { form: CloudTargetFormValues; errors: FormErrors }

export function CloudTargetList({ initialTargets }: { initialTargets: CloudTarget[] }) {
    const { t, locale } = useI18n()
    const { data: targets = initialTargets } = useCloudTargets(initialTargets)
    const updateMutation = useUpdateCloudTarget()
    const deleteMutation = useDeleteCloudTarget()
    const createMutation = useCreateCloudTarget()
    const testMutation = useTestCloudTargetConnection()

    const [rowFormState, setRowFormState] = useState<Record<string, RowFormState>>({})
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
    const [deletingId, setDeletingId] = useState<string | null>(null)

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
    const [runningQueue, setRunningQueue] = useState(false)

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
        const { form } = getRowForm(target)
        updateMutation.mutate({ id: target.id, form: { ...form, enabled: checked } })
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
        const { type, id } = pendingAction
        setPendingAction(null)
        const target = targets.find((t) => t.id === id)
        if (!target) return

        if (type === 'save') {
            const { form } = getRowForm(target)
            updateMutation.mutate(
                { id, form },
                {
                    onSuccess: () => clearRowForm(id),
                    onError: (err) => toast.error(getErrorMessage(err, t('toast.saveFailed'))),
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
            onSuccess: (result) => setTestResults((prev) => ({ ...prev, [id]: result })),
            onError: () => setTestResults((prev) => ({ ...prev, [id]: { success: false, message: t('cloud.failure') } })),
        })
    }

    function createTarget() {
        const errors = validateForm(newForm)
        if (Object.keys(errors).length > 0) {
            setNewErrors(errors)
            return
        }

        createMutation.mutate(newForm, {
            onSuccess: () => {
                setNewForm(emptyForm())
                setNewErrors({})
                toast.success(t('toast.added'))
            },
            onError: (err) => toast.error(getErrorMessage(err, t('toast.addFailed'))),
        })
    }

    async function runQueuedUploads() {
        setRunningQueue(true)
        try {
            // TODO: waiting for the backend queue-upload endpoint
            console.log('execute queued uploads')
        } finally {
            setRunningQueue(false)
        }
    }

    const dialogText = {
        save: { title: t('common.confirmSave'), desc: (name: string) => t('common.confirmSaveDescription', { name }) },
        delete: { title: t('common.confirmDelete'), desc: (name: string) => t('common.confirmDeleteDescription', { name }) },
    } as const

    return (
        <div className='flex h-full flex-col gap-4 overflow-hidden max-md:h-auto max-md:overflow-visible'>
            <div className='flex shrink-0 items-center justify-between gap-3 max-sm:items-start max-sm:flex-col'>
                <h1 className='text-2xl font-bold'>{t('page.cloudSync')}</h1>
                <Button className='max-sm:w-full' disabled={runningQueue} onClick={runQueuedUploads}>
                    {runningQueue ? (
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
                                <th className='whitespace-nowrap p-4'>{t('common.status')}</th>
                                <th className='whitespace-nowrap p-4'>{t('cloud.server')}</th>
                                <th className='whitespace-nowrap p-4'>{t('common.settings')}</th>
                                <th className='whitespace-nowrap p-4'>{t('common.actions')}</th>
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
                                    const deleting = deletingId === target.id
                                    const rowBusy = saving || deleting
                                    const testResult = testResults[target.id]
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
                                                <StatusBadge enabled={form.enabled} activeLabel={t('cloud.online')} />
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
                                                <div className='flex gap-3 flex-col'>
                                                    <div className='w-28 shrink-0 space-y-1.5'>
                                                        <Label
                                                            htmlFor={`interval-${target.id}`}
                                                            className='text-xs text-muted-foreground'>
                                                            {t('cloud.uploadInterval')}
                                                        </Label>
                                                        <div className='flex items-center gap-1.5'>
                                                            <Input
                                                                id={`interval-${target.id}`}
                                                                type='number'
                                                                value={form.uploadIntervalSeconds}
                                                                disabled={rowBusy}
                                                                onChange={(e) =>
                                                                    updateRowForm(target.id, {
                                                                        uploadIntervalSeconds: Number(e.target.value),
                                                                    })
                                                                }
                                                                className={
                                                                    errors.uploadIntervalSeconds
                                                                        ? 'border-destructive'
                                                                        : ''
                                                                }
                                                            />
                                                            <span className='text-xs text-muted-foreground'>{t('common.seconds')}</span>
                                                        </div>
                                                        {errors.uploadIntervalSeconds && (
                                                            <p className='text-xs text-destructive'>
                                                                {t(errors.uploadIntervalSeconds)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className='min-w-0 flex-1 pt-4 space-y-1 text-xs text-muted-foreground'>
                                                        <div className='flex gap-4'>
                                                            <p className='leading-snug'>{t('cloud.lastUpload')}</p>
                                                            <p className='font-bold'>
                                                                {target.lastUploadAt
                                                                    ? formatRelativeTime(target.lastUploadAt, locale)
                                                                    : t('cloud.notUploaded')}
                                                            </p>
                                                        </div>
                                                        <div className='flex gap-4'>
                                                            <p>{t('cloud.pending')}</p>
                                                            <p className='font-bold'>{target.pendingCount}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                                                <div className='flex flex-col items-end gap-1.5'>
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
                                                        className={
                                                            form.enabled
                                                                ? 'w-20 border bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
                                                                : 'w-20 border bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed'
                                                        }
                                                        disabled={testing || !form.enabled}
                                                        onClick={() => runTestConnection(target.id)}>
                                                        {testing ? (
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                        ) : (
                                                            t('cloud.testConnection')
                                                        )}
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
                                                                : testResult.message || t('cloud.failure')}
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

            <Card className='relative shrink-0 px-4 sm:px-6 pt-4 space-y-4'>
                {createMutation.isPending && (
                    <div className='absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60'>
                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                    </div>
                )}
                <h2 className='text-lg font-medium mb-0 font-bold'>{t('cloud.add')}</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-0'>
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
                            className={newErrors.name ? 'border-destructive' : ''}
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
                            className={newErrors.apiBaseUrl ? 'border-destructive' : ''}
                        />
                        {newErrors.apiBaseUrl && <p className='text-xs text-destructive'>{t(newErrors.apiBaseUrl)}</p>}
                    </div>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-0'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-serverid' className='text-xs text-muted-foreground'>
                            {t('cloud.id')}
                        </Label>
                        <Input
                            id='new-serverid'
                            className={`font-mono ${newErrors.apiKey ? 'border-destructive' : ''}`}
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
                            className={newErrors.cloudServerSecret ? 'border-destructive' : ''}
                            value={newForm.apiSecret}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ apiSecret: e.target.value })}
                        />
                        {newErrors.cloudServerSecret && (
                            <p className='text-xs text-destructive'>{t(newErrors.cloudServerSecret)}</p>
                        )}
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='new-interval' className='text-xs text-muted-foreground'>
                            {t('cloud.uploadInterval')}
                        </Label>
                        <Input
                            id='new-interval'
                            type='number'
                            placeholder='60'
                            value={newForm.uploadIntervalSeconds}
                            disabled={createMutation.isPending}
                            onChange={(e) => updateNewForm({ uploadIntervalSeconds: Number(e.target.value) })}
                            className={newErrors.uploadIntervalSeconds ? 'border-destructive' : ''}
                        />
                        {newErrors.uploadIntervalSeconds && (
                            <p className='text-xs text-destructive'>{t(newErrors.uploadIntervalSeconds)}</p>
                        )}
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
            </Card>

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
