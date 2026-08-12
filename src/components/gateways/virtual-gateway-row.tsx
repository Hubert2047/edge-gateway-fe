'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Gateway, GatewayFormValues } from '@/types/gateway'
import { useUpdateGateway } from '@/lib/api/gateway'
import { useI18n } from '@/lib/i18n'
import { StatusBadge } from '../status-badge'

export function VirtualGatewayRow({ gateway }: { gateway: Gateway }) {
    const { t } = useI18n()
    const updateGateway = useUpdateGateway()
    const [enabled, setEnabled] = useState(gateway.enabled)
    const [pollIntervalSeconds, setPollIntervalSeconds] = useState(gateway.pollIntervalSeconds)
    const saving = updateGateway.isPending && updateGateway.variables?.id === gateway.id

    function saveSettings(nextEnabled = enabled, nextPollIntervalSeconds = pollIntervalSeconds) {
        const form: GatewayFormValues = {
            name: gateway.name,
            ip: gateway.ip,
            port: gateway.port,
            enabled: nextEnabled,
            pollIntervalSeconds: nextPollIntervalSeconds,
            note: gateway.note,
        }
        updateGateway.mutate(
            { id: gateway.id, form },
            {
                onSuccess: () => toast.success(t('gateway.virtualSaved')),
                onError: () => {
                    setEnabled(gateway.enabled)
                    toast.error(t('toast.saveFailed'))
                },
            },
        )
    }

    function toggleEnabled(nextEnabled: boolean) {
        setEnabled(nextEnabled)
        saveSettings(nextEnabled)
    }

    return (
        <tr className={`border-t bg-emerald-50/30 align-top ${saving ? 'pointer-events-none opacity-50' : ''}`}>
            <td data-label={t('common.status')} className='p-4 space-y-2'>
                <Checkbox
                    checked={enabled}
                    disabled={saving}
                    onCheckedChange={(checked) => toggleEnabled(checked === true)}
                />
                <StatusBadge status={enabled ? "online" : "offline"} />
            </td>
            <td data-label={t('common.gateway')} className='p-4 space-y-3'>
                <div className='space-y-1.5'>
                    <Label className='text-xs text-muted-foreground'>{t('common.displayName')}</Label>
                    <div className='flex items-center gap-2'>
                        <p className='font-semibold'>{t('gateway.virtual')}</p>
                        <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'>
                            {t('gateway.virtualBadge')}
                        </span>
                    </div>
                </div>
                <div className='max-w-32 space-y-1.5'>
                    <Label htmlFor='virtual-gateway-poll' className='text-xs text-muted-foreground'>
                        {t('common.interval')}
                    </Label>
                    <Input
                        id='virtual-gateway-poll'
                        type='number'
                        min={1}
                        value={pollIntervalSeconds}
                        disabled={saving}
                        onChange={(event) => setPollIntervalSeconds(Number(event.target.value))}
                    />
                </div>
            </td>
            <td data-label={t('common.info')} className='p-4 text-muted-foreground'>
                <p>{t('gateway.meterCount', { count: gateway.meterCount })}</p>
                <p>{t('gateway.virtualDescription')}</p>
            </td>
            <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                <div className='flex flex-col items-end gap-1.5'>
                    <Button size='sm' className='w-20' disabled={saving || pollIntervalSeconds <= 0} onClick={() => saveSettings()}>
                        {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : t('common.save')}
                    </Button>
                </div>
            </td>
        </tr>
    )
}
