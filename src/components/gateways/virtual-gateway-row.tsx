'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'
import { StatusBadge } from '../status-badge'

export function VirtualGatewayRow({ meterCount }: { meterCount: number }) {
    const { t } = useI18n()
    const [enabled, setEnabled] = useState(true)
    const [pollIntervalSeconds, setPollIntervalSeconds] = useState(60)

    function saveSettings() {
        toast.success(t('gateway.virtualSaved'))
    }

    function collectNow() {
        toast.info(t('gateway.virtualCollectUnavailable'))
    }

    return (
        <tr className='border-t bg-emerald-50/30 align-top'>
            <td data-label={t('common.status')} className='p-4 space-y-2'>
                <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
                <StatusBadge enabled={enabled} activeLabel={t('gateway.monitoring')} />
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
                        onChange={(event) => setPollIntervalSeconds(Number(event.target.value))}
                    />
                </div>
            </td>
            <td data-label={t('common.info')} className='p-4 text-muted-foreground'>
                <p>{t('gateway.meterCount', { count: meterCount })}</p>
                <p>{t('gateway.virtualDescription')}</p>
            </td>
            <td data-label={t('common.actions')} data-role='actions' className='p-4'>
                <div className='flex flex-col items-end gap-1.5'>
                    <Button size='sm' className='w-20' disabled={pollIntervalSeconds <= 0} onClick={saveSettings}>
                        {t('common.save')}
                    </Button>
                    <Button
                        size='sm'
                        variant='secondary'
                        className='w-20 border text-emerald-700'
                        disabled={!enabled}
                        onClick={collectNow}>
                        {t('common.collectNow')}
                    </Button>
                </div>
            </td>
        </tr>
    )
}
