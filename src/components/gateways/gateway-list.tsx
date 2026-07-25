'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Hub, HubFormValues } from '@/types/hub'

function emptyForm(): HubFormValues {
    return { hubName: '', hubIp: '', hubPort: 10123, enabled: true, pollIntervalSeconds: 60, note: '' }
}

function hubToForm(hub: Hub): HubFormValues {
    return {
        hubName: hub.hubName,
        hubIp: hub.hubIp,
        hubPort: hub.hubPort,
        enabled: hub.enabled,
        pollIntervalSeconds: hub.pollIntervalSeconds,
        note: hub.note,
    }
}

export function GatewayList({ initialHubs }: { initialHubs: Hub[] }) {
    console.log(initialHubs)
    const router = useRouter()
    const [rows, setRows] = useState(
        initialHubs.map((hub) => ({ hub, form: hubToForm(hub), saving: false }))
    )
    const [newForm, setNewForm] = useState(emptyForm())
    const [creating, setCreating] = useState(false)

    function updateRowForm(id: number, patch: Partial<HubFormValues>) {
        setRows((prev) =>
            prev.map((row) => (row.hub.id === id ? { ...row, form: { ...row.form, ...patch } } : row))
        )
    }

    async function saveRow(id: number) {
        const row = rows.find((r) => r.hub.id === id)
        if (!row) return
        setRows((prev) => prev.map((r) => (r.hub.id === id ? { ...r, saving: true } : r)))

        await fetch(`/api/hubs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row.form),
        })

        setRows((prev) => prev.map((r) => (r.hub.id === id ? { ...r, saving: false } : r)))
        router.refresh()
    }

    async function deleteRow(id: number) {
        await fetch(`/api/hubs/${id}`, { method: 'DELETE' })
        setRows((prev) => prev.filter((row) => row.hub.id !== id))
        router.refresh()
    }

    async function createHub() {
        setCreating(true)
        await fetch('/api/hubs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newForm),
        })
        setCreating(false)
        setNewForm(emptyForm())
        router.refresh()
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-left">
                        <tr>
                            <th className="p-4">狀態</th>
                            <th className="p-4">閘道器</th>
                            <th className="p-4">細部設定</th>
                            <th className="p-4">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ hub, form, saving }) => (
                            <tr key={hub.id} className="border-t align-top">
                                <td className="p-4 space-y-2">
                                    <Checkbox
                                        checked={form.enabled}
                                        onCheckedChange={(checked) => updateRowForm(hub.id, { enabled: checked === true })}
                                    />
                                    <Badge variant={form.enabled ? 'default' : 'destructive'}>
                                        {form.enabled ? '監控中' : '停用'}
                                    </Badge>
                                </td>
                                <td className="p-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">顯示名稱</p>
                                        <Input value={form.hubName} onChange={(e) => updateRowForm(hub.id, { hubName: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">IP</p>
                                            <Input value={form.hubIp} onChange={(e) => updateRowForm(hub.id, { hubIp: e.target.value })} />
                                        </div>
                                        <div className="w-28">
                                            <p className="text-xs text-muted-foreground">PORT</p>
                                            <Input type="number" value={form.hubPort} onChange={(e) => updateRowForm(hub.id, { hubPort: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">採集頻率（秒）</p>
                                        <Input type="number" value={form.pollIntervalSeconds} onChange={(e) => updateRowForm(hub.id, { pollIntervalSeconds: Number(e.target.value) })} />
                                    </div>
                                </td>
                                <td className="p-4 text-muted-foreground">
                                    <p>{hub.meterCount} 智慧勾表數</p>
                                    <p>最近成功：{hub.updatedAt}</p>
                                </td>
                                <td className="p-4 space-y-2">
                                    <Button className="w-full" disabled={saving} onClick={() => saveRow(hub.id)}>儲存</Button>
                                    <Button className="w-full" variant="secondary" disabled>立即收集</Button>
                                    <Button className="w-full" variant="destructive" onClick={() => deleteRow(hub.id)}>刪除</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">新增閘道器</h2>
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="顯示名稱" value={newForm.hubName} onChange={(e) => setNewForm((f) => ({ ...f, hubName: e.target.value }))} />
                    <Input placeholder="IP，例如 192.168.1.100" value={newForm.hubIp} onChange={(e) => setNewForm((f) => ({ ...f, hubIp: e.target.value }))} />
                    <Input type="number" placeholder="PORT" value={newForm.hubPort} onChange={(e) => setNewForm((f) => ({ ...f, hubPort: Number(e.target.value) }))} />
                    <Input type="number" placeholder="採集頻率（秒）" value={newForm.pollIntervalSeconds} onChange={(e) => setNewForm((f) => ({ ...f, pollIntervalSeconds: Number(e.target.value) }))} />
                </div>
                <Button disabled={creating} onClick={createHub} className="w-max cursor-pointer" size="lg">新增</Button>
            </Card>
        </div>
    )
}