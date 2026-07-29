'use client'

import { useEffect, useState } from 'react'
import { HubSwitcher } from './hub-switcher'
import { MeterList } from './meter-list'
import type { Hub } from '@/types/hub'
import type { Meter } from '@/types/meter'

export function MetersClient({
    hubs,
    initialHubUid,
    initialMeters,
}: {
    hubs: Hub[]
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
        <>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl font-bold'>智慧勾表</h1>
                <HubSwitcher hubs={hubs} currentHubUid={hubUid} onHubChange={handleHubChange} />
            </div>
            <div className='flex-1 min-h-0'>
                <MeterList hubUid={hubUid} initialMeters={hubUid === initialHubUid ? initialMeters : undefined} />
            </div>
        </>
    )
}
