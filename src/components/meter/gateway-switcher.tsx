'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import type { Gateway } from '@/types/gateway'

export function GatewaySwitcher({
    gateways,
    currentGatewayId,
    onGatewayChange,
}: {
    gateways: Gateway[]
    currentGatewayId: number
    onGatewayChange: (gatewayId: number) => void
}) {
    const { t } = useI18n()
    const current = gateways.find((gateway) => gateway.id === currentGatewayId)

    return (
        <Select value={String(currentGatewayId)} onValueChange={(value) => value && onGatewayChange(Number(value))}>
            <SelectTrigger className='w-48 max-sm:w-full'>
                <SelectValue>{current ? getGatewayDisplayName(current, t) : ''}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {gateways.map((gateway) => (
                    <SelectItem key={gateway.id} value={String(gateway.id)}>
                        {getGatewayDisplayName(gateway, t)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
