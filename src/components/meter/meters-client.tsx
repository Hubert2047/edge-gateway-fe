'use client'

import { useEffect, useState } from 'react'
import { MeterList } from './meter-list'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export function MetersClient({
    gateways: gateways,
    initialGatewayId,
    initialMeters,
}: {
    gateways: Gateway[]
    initialGatewayId: number
    initialMeters: Meter[]
}) {
    const [gatewayId, setGatewayId] = useState(initialGatewayId)

    useEffect(() => {
        const url = new URL(window.location.href)
        if (url.searchParams.get('gatewayId') !== String(initialGatewayId)) {
            url.searchParams.set('gatewayId', String(initialGatewayId))
            window.history.replaceState(null, '', url.toString())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleGatewayChange(nextGatewayId: number) {
        if (nextGatewayId === gatewayId) return
        setGatewayId(nextGatewayId)
        const url = new URL(window.location.href)
        url.searchParams.set('gatewayId', String(nextGatewayId))
        window.history.replaceState(null, '', url.toString())
    }

    return (
        <div className='flex-1 min-h-0'>
            <MeterList
                key={gatewayId}
                gateways={gateways}
                gatewayId={gatewayId}
                initialMeters={gatewayId === initialGatewayId ? initialMeters : undefined}
                onGatewayChange={handleGatewayChange}
            />
        </div>
    )
}
