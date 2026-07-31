import { ProcessControlAnalysis } from '@/components/process-control/process-control-analysis'
import { GATEWAY_ENDPOINT } from '@/constances/url'
import { serverApiFetch } from '@/lib/api/server'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export default async function ProcessControlPage() {
    const gateways = await serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base)
    const meterResults = await Promise.all(
        gateways.map((gateway) => serverApiFetch<Meter[]>(GATEWAY_ENDPOINT.getMeters(gateway.uid))),
    )

    return <ProcessControlAnalysis gateways={gateways} meters={meterResults.flat()} />
}
