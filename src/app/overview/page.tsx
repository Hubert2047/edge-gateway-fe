import { OverviewDashboard } from '@/components/overview/overview-dashboard'
import { serverApiFetch } from '@/lib/api/server'
import type { CloudTarget } from '@/types/cloud-target'
import type { Hub } from '@/types/hub'
import type { Meter } from '@/types/meter'

export default async function OverviewPage() {
    const [hubs, cloudTargets] = await Promise.all([
        serverApiFetch<Hub[]>('/api/hubs'),
        serverApiFetch<CloudTarget[]>('/api/cloud-targets'),
    ])
    const meterResults = await Promise.all(hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)))

    return <OverviewDashboard hubs={hubs} cloudTargets={cloudTargets} meters={meterResults.flat()} />
}
