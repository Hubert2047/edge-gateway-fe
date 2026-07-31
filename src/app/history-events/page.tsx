import { HistoryEventsView } from '@/components/history-events/history-events-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export default async function HistoryEventsPage() {
    const hubs = await serverApiFetch<Gateway[]>('/api/hubs')
    const meterResults = await Promise.all(
        hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)),
    )

    return <HistoryEventsView hubs={hubs} meters={meterResults.flat()} />
}
