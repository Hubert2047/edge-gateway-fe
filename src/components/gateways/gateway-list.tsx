'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useHubs, useUpdateHub, useDeleteHub, useCreateHub } from '@/lib/api/hub.queries'
import { formatRelativeTime, getErrorMessage } from '@/lib/utils'
import { StatusBadge } from '../status-badge'

function emptyForm(): HubFormValues {
    return {
        uid: '',
        hubName: '',
        hubIp: '192.168.1.100',
        hubPort: 10123,
        enabled: true,
        pollIntervalSeconds: 60,
        note: ''
    }
}

function hubToForm(hub: Hub): HubFormValues {
    return {
        uid: hub.uid,
        hubName: hub.hubName,
        hubIp: hub.hubIp,
        hubPort: hub.hubPort,
        enabled: hub.enabled,
        pollIntervalSeconds: hub.pollIntervalSeconds,
        note: hub.note,
    }
}

type FormErrors = Partial<Record<'hubName' | 'hubIp' | 'hubPort' | 'pollIntervalSeconds', string>>

function validateForm(form: HubFormValues): FormErrors {
    const errors: FormErrors = {}
    if (!form.hubName.trim()) errors.hubName = '請輸入顯示名稱'
    if (!form.hubIp.trim()) errors.hubIp = '請輸入 IP'
    if (!form.hubPort || form.hubPort <= 0) errors.hubPort = '請輸入有效的 PORT'
    if (!form.pollIntervalSeconds || form.pollIntervalSeconds <= 0) errors.pollIntervalSeconds = '請輸入有效的秒數'
    return errors
}

type PendingAction = { type: 'save' | 'delete' | 'collect'; uid: string; displayName: string } | null
type RowFormState = { form: HubFormValues; errors: FormErrors }

export function GatewayList({ initialHubs }: { initialHubs: Hub[] }) {
    const { data: hubs = initialHubs } = useHubs(initialHubs)
    const updateHubMutation = useUpdateHub()
    const deleteHubMutation = useDeleteHub()
    const createHubMutation = useCreateHub()

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

        setPendingAction({ type: 'save', uid: hub.uid, displayName: form.hubName || hub.uid })
    }

    function requestDelete(hub: Hub) {
        const { form } = getRowForm(hub)
        setPendingAction({ type: 'delete', uid: hub.uid, displayName: form.hubName || hub.uid })
    }

    function requestCollect(hub: Hub) {
        const { form } = getRowForm(hub)
        setPendingAction({ type: 'collect', uid: hub.uid, displayName: form.hubName || hub.uid })
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
                    onError: (err) => toast.error(getErrorMessage(err, '儲存失敗')),
                }
            )
        }

        if (type === 'delete') {
            setDeletingUid(uid)
            deleteHubMutation.mutate(uid, {
                onSettled: () => setDeletingUid((prev) => (prev === uid ? null : prev)),
                onError: (err) => toast.error(getErrorMessage(err, '刪除失敗')),
            })
        }

        if (type === 'collect') {
            setCollectingUids((prev) => new Set(prev).add(uid))
            try {
                // TODO: nối API thu thập ngay khi có endpoint, ví dụ:
                // await collectHubNow(uid)
                console.log('collect now:', uid)
            } finally {
                setCollectingUids((prev) => {
                    const next = new Set(prev)
                    next.delete(uid)
                    return next
                })
            }
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
                toast.success('新增成功')
            },
            onError: (err) => toast.error(getErrorMessage(err, '新增失敗')),
        })
    }

    const dialogText = {
        save: { title: '確認儲存', desc: (name: string) => `確定要儲存「${name}」的設定嗎？` },
        delete: { title: '確認刪除', desc: (name: string) => `確定要刪除「${name}」嗎？此操作無法復原。` },
        collect: { title: '確認收集', desc: (name: string) => `確定要立即對「${name}」執行收集嗎？` },
    } as const

    return (
        <div className="flex h-full flex-col gap-4 overflow-hidden">
            <Card className="flex flex-1 min-h-0 flex-col overflow-hidden pt-0 border">
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <table className="w-full text-sm">
                        <colgroup>
                            <col className="w-28" />
                            <col className='min-w-72' />
                            <col className="min-w-42 xl:w-72" />
                            <col className="w-28" />
                        </colgroup>
                        <thead className="bg-muted text-left sticky top-0 z-10">
                            <tr>
                                <th className="p-4">狀態</th>
                                <th className="p-4">閘道器</th>
                                <th className="p-4">細部設定</th>
                                <th className="p-4">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hubs.map((hub) => {
                                const { form, errors } = getRowForm(hub)
                                const saving = updateHubMutation.isPending && updateHubMutation.variables?.uid === hub.uid
                                const collecting = collectingUids.has(hub.uid)
                                const deleting = deletingUid === hub.uid
                                return (
                                    <tr
                                        key={hub.uid}
                                        className={`border-t align-top transition-colors  ${deleting ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <td className="p-4 space-y-2">
                                            <Checkbox
                                                checked={form.enabled}
                                                onCheckedChange={(checked) => toggleEnabled(hub, checked === true)}
                                            />
                                            <StatusBadge enabled={form.enabled} activeLabel="監控中" />
                                        </td>
                                        <td className="p-4 space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">ID</Label>
                                                <p className="text-sm font-mono text-foreground/80">{hub.uid}</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`name-${hub.uid}`} className="text-xs text-muted-foreground">顯示名稱</Label>
                                                <Input
                                                    id={`name-${hub.uid}`}
                                                    value={form.hubName}
                                                    onChange={(e) => updateRowForm(hub.uid, { hubName: e.target.value })}
                                                    className={errors.hubName ? 'border-destructive' : ''}
                                                />
                                                {errors.hubName && <p className="text-xs text-destructive">{errors.hubName}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 space-y-1.5">
                                                    <Label htmlFor={`ip-${hub.uid}`} className="text-xs text-muted-foreground">IP</Label>
                                                    <Input
                                                        id={`ip-${hub.uid}`}
                                                        value={form.hubIp}
                                                        onChange={(e) => updateRowForm(hub.uid, { hubIp: e.target.value })}
                                                        className={errors.hubIp ? 'border-destructive' : ''}
                                                    />
                                                    {errors.hubIp && <p className="text-xs text-destructive">{errors.hubIp}</p>}
                                                </div>
                                                <div className="w-28 space-y-1.5">
                                                    <Label htmlFor={`port-${hub.uid}`} className="text-xs text-muted-foreground">PORT</Label>
                                                    <Input
                                                        id={`port-${hub.uid}`}
                                                        type="number"
                                                        value={form.hubPort}
                                                        onChange={(e) => updateRowForm(hub.uid, { hubPort: Number(e.target.value) })}
                                                        className={errors.hubPort ? 'border-destructive' : ''}
                                                    />
                                                    {errors.hubPort && <p className="text-xs text-destructive">{errors.hubPort}</p>}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`poll-${hub.uid}`} className="text-xs text-muted-foreground">採集頻率（秒）</Label>
                                                <Input
                                                    id={`poll-${hub.uid}`}
                                                    type="number"
                                                    value={form.pollIntervalSeconds}
                                                    onChange={(e) => updateRowForm(hub.uid, { pollIntervalSeconds: Number(e.target.value) })}
                                                    className={errors.pollIntervalSeconds ? 'border-destructive' : ''}
                                                />
                                                {errors.pollIntervalSeconds && <p className="text-xs text-destructive">{errors.pollIntervalSeconds}</p>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            <p>{hub.meterCount} 智慧勾表數</p>
                                            <p>最近成功：{formatRelativeTime(hub.updatedAt)}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="w-20"
                                                    disabled={saving}
                                                    onClick={() => requestSave(hub)}
                                                >
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '儲存'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={!form.enabled || collecting}
                                                    onClick={() => requestCollect(hub)}
                                                    className={
                                                        form.enabled
                                                            ? 'w-20 border text-emerald-700'
                                                            : 'w-20 border text-muted-foreground'
                                                    }
                                                >
                                                    {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : '立即收集'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="w-20 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                                    variant="ghost"
                                                    disabled={deleting}
                                                    onClick={() => requestDelete(hub)}
                                                >
                                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '刪除'}
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

            <Card className="shrink-0 px-4 sm:px-6 pt-4 space-y-4">
                <h2 className="text-lg font-medium mb-0 font-bold">新增閘道器</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-0">
                    <div className="space-y-1.5">
                        <Label htmlFor="new-id" className="text-xs text-muted-foreground">
                            ID
                        </Label>
                        <Input
                            id="new-id"
                            placeholder="例如：GW001"
                            value={newForm.uid}
                            onChange={(e) => updateNewForm({ uid: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-name" className="text-xs text-muted-foreground">顯示名稱</Label>
                        <Input
                            id="new-name"
                            placeholder="例如：一樓機房"
                            value={newForm.hubName}
                            onChange={(e) => updateNewForm({ hubName: e.target.value })}
                            className={newErrors.hubName ? 'border-destructive' : ''}
                        />
                        {newErrors.hubName && <p className="text-xs text-destructive">{newErrors.hubName}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-ip" className="text-xs text-muted-foreground">IP 位址</Label>
                        <Input
                            id="new-ip"
                            placeholder="192.168.1.100"
                            value={newForm.hubIp}
                            onChange={(e) => updateNewForm({ hubIp: e.target.value })}
                            className={newErrors.hubIp ? 'border-destructive' : ''}
                        />
                        {newErrors.hubIp && <p className="text-xs text-destructive">{newErrors.hubIp}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-port" className="text-xs text-muted-foreground">PORT</Label>
                        <Input
                            id="new-port"
                            type="number"
                            placeholder="10123"
                            value={newForm.hubPort}
                            onChange={(e) => updateNewForm({ hubPort: Number(e.target.value) })}
                            className={newErrors.hubPort ? 'border-destructive' : ''}
                        />
                        {newErrors.hubPort && <p className="text-xs text-destructive">{newErrors.hubPort}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="new-poll" className="text-xs text-muted-foreground">採集頻率（秒）</Label>
                        <Input
                            id="new-poll"
                            type="number"
                            placeholder="60"
                            value={newForm.pollIntervalSeconds}
                            onChange={(e) => updateNewForm({ pollIntervalSeconds: Number(e.target.value) })}
                            className={newErrors.pollIntervalSeconds ? 'border-destructive' : ''}
                        />
                        {newErrors.pollIntervalSeconds && <p className="text-xs text-destructive">{newErrors.pollIntervalSeconds}</p>}
                    </div>
                </div>
                <div className="space-y-1.5 mb-0">
                    <Label htmlFor="new-note" className="text-xs text-muted-foreground">備註</Label>
                    <Input
                        id="new-note"
                        placeholder="選填"
                        value={newForm.note}
                        onChange={(e) => updateNewForm({ note: e.target.value })}
                    />
                </div>
                <Button disabled={createHubMutation.isPending} onClick={createHub} size="lg" className="w-full sm:w-max">
                    {createHubMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            新增中...
                        </>
                    ) : (
                        '新增'
                    )}
                </Button>
            </Card>

            <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingAction ? dialogText[pendingAction.type].title : ''}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingAction ? dialogText[pendingAction.type].desc(pendingAction.displayName) : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPendingAction}
                            className={
                                pendingAction?.type === 'delete'
                                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                                    : ''
                            }
                        >
                            確認
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}