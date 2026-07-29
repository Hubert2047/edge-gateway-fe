import { HistoryEventsView } from '@/components/history-events/history-events-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Hub } from '@/types/hub'
import type { Meter } from '@/types/meter'

export default async function HistoryEventsPage() {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')
    const meterResults = await Promise.all(hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)))

    return <HistoryEventsView hubs={hubs} meters={meterResults.flat()} />
}
