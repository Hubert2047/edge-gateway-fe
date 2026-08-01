'use client'

import { useEffect, useState } from 'react'
import { HubSwitcher } from './hub-switcher'
import { MeterList } from './meter-list'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { useI18n } from '@/lib/i18n'

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
    const { t } = useI18n()

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
            <div className='flex items-center justify-between gap-3 max-sm:items-start max-sm:flex-col'>
                <h1 className='text-xl font-bold sm:text-3xl'>{t('page.meters')}</h1>
                <HubSwitcher hubs={hubs} currentHubUid={hubUid} onHubChange={handleHubChange} />
            </div>
            <div className='flex-1 min-h-0'>
                <MeterList hubUid={hubUid} initialMeters={hubUid === initialHubUid ? initialMeters : undefined} />
            </div>
        </>
    )
}
