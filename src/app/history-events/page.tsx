import { HistoryEventsView } from '@/components/history-events/history-events-view'
import { GATEWAY_ENDPOINT } from '@/constances/url'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { hu } from 'zod/locales'

export default async function HistoryEventsPage() {
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)
    const meterResults = await Promise.all(
        gateways.map((gateway) => serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gateway.uid))),
    )

    return <HistoryEventsView gateways={gateways} meters={meterResults.flat()} />
}
