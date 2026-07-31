import { HistoryDataView } from '@/components/history-data/history-data-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export default async function HistoryDataPage() {
    const hubs = await serverApiFetch<Gateway[]>('/api/hubs')
    const meterResults = await Promise.all(
        hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)),
    )

    return <HistoryDataView hubs={hubs} meters={meterResults.flat()} />
}
