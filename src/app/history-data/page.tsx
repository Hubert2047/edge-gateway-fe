import { HistoryDataView } from '@/components/history-data/history-data-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Hub } from '@/types/hub'
import type { Meter } from '@/types/meter'

export default async function HistoryDataPage() {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')
    const meterResults = await Promise.all(hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)))

    return <HistoryDataView hubs={hubs} meters={meterResults.flat()} />
}
