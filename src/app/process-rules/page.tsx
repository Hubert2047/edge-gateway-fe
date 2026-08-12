import { ProcessRulesView } from '@/components/process-rules/process-rules-view'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { requireAdmin } from '@/lib/auth-guard'
import { GATEWAY_ENDPOINT } from '@/constances/url'

export default async function ProcessRulesPage() {
    await requireAdmin()
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)
    const meterResults = await Promise.all(
        gateways.map((gateway) => serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gateway.id))),
    )

    return <ProcessRulesView gateways={gateways} meters={meterResults.flat()} />
}
