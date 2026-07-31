'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    const current = hubs.find((h) => h.uid === currentHubUid)
    return (
        <Select value={currentHubUid} onValueChange={(v) => v && onHubChange(v)}>
            <SelectTrigger className='w-48 max-sm:w-full'>
                <SelectValue>{current?.name ?? currentHubUid}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {hubs.map((h) => (
                    <SelectItem key={h.uid} value={h.uid}>
                        {h.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
