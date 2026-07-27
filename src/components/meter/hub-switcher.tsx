'use client'

import { useRouter } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Hub } from '@/types/hub'

export function HubSwitcher({ hubs, currentHubUid }: { hubs: Hub[]; currentHubUid: string }) {
    const router = useRouter()
    const current = hubs.find((h) => h.uid === currentHubUid)

    return (
        <Select
            value={currentHubUid}
            onValueChange={(uid) => {
                if (!uid) return
                router.push(`/meters?hubUid=${encodeURIComponent(uid)}`)
            }}
        >
            <SelectTrigger className="w-56">
                <SelectValue>{current?.hubName ?? currentHubUid}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {hubs.map((hub) => (
                    <SelectItem key={hub.uid} value={hub.uid}>
                        {hub.hubName}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}