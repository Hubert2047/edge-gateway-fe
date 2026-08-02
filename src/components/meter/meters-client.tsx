'use client'

import { useEffect, useState } from 'react'
import { MeterList } from './meter-list'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export function MetersClient({
    hubs,
    initialHubUid,
    initialMeters,
}: {
    hubs: Gateway[]
    initialHubUid: string
    initialMeters: Meter[]
}) {
    const [hubUid, setHubUid] = useState(initialHubUid)

    useEffect(() => {
        const url = new URL(window.location.href)
        if (url.searchParams.get('hubUid') !== initialHubUid) {
            url.searchParams.set('hubUid', initialHubUid)
            window.history.replaceState(null, '', url.toString())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleHubChange(nextHubUid: string) {
        if (nextHubUid === hubUid) return
        setHubUid(nextHubUid)
        const url = new URL(window.location.href)
        url.searchParams.set('hubUid', nextHubUid)
        window.history.replaceState(null, '', url.toString())
    }

    return (
        <div className='flex-1 min-h-0'>
            <MeterList
                key={hubUid}
                hubs={hubs}
                hubUid={hubUid}
                initialMeters={hubUid === initialHubUid ? initialMeters : undefined}
                onHubChange={handleHubChange}
            />
        </div>
    )
}
