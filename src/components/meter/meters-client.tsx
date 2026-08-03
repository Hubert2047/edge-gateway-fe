'use client'

import { useEffect, useState } from 'react'
import { MeterList } from './meter-list'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export function MetersClient({
    gateways: gateways,
    initialGatewayUid: initialGatewayUid,
    initialMeters,
}: {
    gateways: Gateway[]
    initialGatewayUid: string
    initialMeters: Meter[]
}) {
    const [gatewayUid, setGatewayUid] = useState(initialGatewayUid)

    useEffect(() => {
        const url = new URL(window.location.href)
        if (url.searchParams.get('gatewayUid') !== initialGatewayUid) {
            url.searchParams.set('gatewayUid', initialGatewayUid)
            window.history.replaceState(null, '', url.toString())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleHubChange(nextGatewayUid: string) {
        if (nextGatewayUid === gatewayUid) return
        setGatewayUid(nextGatewayUid)
        const url = new URL(window.location.href)
        url.searchParams.set('gatewayUid', nextGatewayUid)
        window.history.replaceState(null, '', url.toString())
    }

    return (
        <div className='flex-1 min-h-0'>
            <MeterList
                key={gatewayUid}
                gateways={gateways}
                gatewayUid={gatewayUid}
                initialMeters={gatewayUid === initialGatewayUid ? initialMeters : undefined}
                onHubChange={handleHubChange}
            />
        </div>
    )
}
