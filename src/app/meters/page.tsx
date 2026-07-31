import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import type { Gateway } from '@/types/gateway'
import { MetersClient } from '@/components/meter/meters-client'
import { LocalizedText } from '@/components/i18n/localized-text'
import { requireAdmin } from '@/lib/auth-guard'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ hubUid?: string }> }) {
    await requireAdmin()
    const hubs = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)

    if (hubs.length === 0) {
        return (
            <div className='p-6 h-full'>
                <h1 className='mb-6 text-2xl font-bold'>
                    <LocalizedText messageKey='page.meters' />
                </h1>
                <p className='text-muted-foreground'>
                    <LocalizedText messageKey='page.noGateways' />
                </p>
            </div>
        )
    }

    const { hubUid: requestedUid } = await searchParams
    const uid = requestedUid && hubs.some((h) => h.uid === requestedUid) ? requestedUid : hubs[0].uid

    const initialMeters = await serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(uid))

    return (
        <div className='h-full flex flex-col gap-6'>
            <MetersClient hubs={hubs} initialHubUid={uid} initialMeters={initialMeters} />
        </div>
    )
}
