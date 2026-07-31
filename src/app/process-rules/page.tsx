import { ProcessRulesView } from '@/components/process-rules/process-rules-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { requireAdmin } from '@/lib/auth-guard'

export default async function ProcessRulesPage() {
    await requireAdmin()
    const hubs = await serverApiFetch<Gateway[]>('/api/hubs')
    const meterResults = await Promise.all(
        hubs.map((hub) => serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`)),
    )

    return <ProcessRulesView hubs={hubs} meters={meterResults.flat()} />
}
