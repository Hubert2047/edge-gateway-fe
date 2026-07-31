import { ProcessControlAnalysis } from '@/components/process-control/process-control-analysis'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export default async function ProcessControlPage() {
    const hubs = await serverApiFetch<Gateway[]>('/api/hubs')
    const meterResults = await Promise.all(
        hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)),
    )

    return <ProcessControlAnalysis hubs={hubs} meters={meterResults.flat()} />
}
