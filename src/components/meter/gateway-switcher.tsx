'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import type { Gateway } from '@/types/gateway'

export function GatewaySwitcher({
    gateways,
    currentGatewayUid,
    onGatewayChange,
}: {
    gateways: Gateway[]
    currentGatewayUid: string
    onGatewayChange: (gatewayUid: string) => void
}) {
    const { t } = useI18n()
    const current = gateways.find((gateway) => gateway.uid === currentGatewayUid)

    return (
        <Select value={currentGatewayUid} onValueChange={(value) => value && onGatewayChange(value)}>
            <SelectTrigger className='w-48 max-sm:w-full'>
                <SelectValue>{current ? getGatewayDisplayName(current, t) : ''}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {gateways.map((gateway) => (
                    <SelectItem key={gateway.uid} value={gateway.uid}>
                        {getGatewayDisplayName(gateway, t)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
