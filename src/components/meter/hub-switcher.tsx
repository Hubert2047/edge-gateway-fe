'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getGatewayDisplayName } from '@/lib/gateway'
import { useI18n } from '@/lib/i18n'
import type { Gateway } from '@/types/gateway'

export function HubSwitcher({
    hubs,
    currentHubUid,
    onHubChange,
}: {
    hubs: Gateway[]
    currentHubUid: string
    onHubChange: (hubUid: string) => void
}) {
    const { t } = useI18n()
    const current = hubs.find((hub) => hub.uid === currentHubUid)

    return (
        <Select value={currentHubUid} onValueChange={(value) => value && onHubChange(value)}>
            <SelectTrigger className='w-48 max-sm:w-full'>
                <SelectValue>{current ? getGatewayDisplayName(current, t) : ''}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {hubs.map((hub) => (
                    <SelectItem key={hub.uid} value={hub.uid}>
                        {getGatewayDisplayName(hub, t)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
