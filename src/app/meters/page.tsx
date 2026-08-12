import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import type { Gateway } from '@/types/gateway'
import { MetersClient } from '@/components/meter/meters-client'
import { LocalizedText } from '@/components/i18n/localized-text'
import { requireAdmin } from '@/lib/auth-guard'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ gatewayId?: string }> }) {
    await requireAdmin()
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)

    if (gateways.length === 0) {
        return (
            <div className='h-full'>
                <h1 className='text-3xl font-bold'>
                    <LocalizedText messageKey='page.meters' />
                </h1>
                <p className='text-muted-foreground'>
                    <LocalizedText messageKey='page.noGateways' />
                </p>
            </div>
        )
    }

    const { gatewayId: requestedId } = await searchParams
    const parsedId = Number(requestedId)
    const gatewayId = Number.isInteger(parsedId) && gateways.some((g) => g.id === parsedId) ? parsedId : gateways[0].id

    const initialMeters = await serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gatewayId))

    return (
        <div className='h-full flex flex-col gap-6'>
            <MetersClient gateways={gateways} initialGatewayId={gatewayId} initialMeters={initialMeters} />
        </div>
    )
}
