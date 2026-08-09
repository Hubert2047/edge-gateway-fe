import { OverviewDashboard } from '@/components/overview/overview-dashboard'
import { ServerApiError, serverApiFetch } from '@/lib/api/server'
import { authOptions } from '@/lib/auth'
import { normalizeRole } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import type { CloudTargetListResponse } from '@/types/cloud-target'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'
import { CLOUD_TARGET_ENDPOINT, GATEWAY_ENDPOINT, METER_ENDPOINT } from '@/constances/url'

export default async function OverviewPage() {
    const session = await getServerSession(authOptions)
    const isAdmin = normalizeRole(session?.user?.role) === 'admin'
    const [gateways, cloudTargetList] = isAdmin
        ? await Promise.all([
              serverApiFetch<Gateway[]>(GATEWAY_ENDPOINT.base),
              serverApiFetch<CloudTargetListResponse>(CLOUD_TARGET_ENDPOINT.base),
          ])
        : [await safeFetch<Gateway[]>(GATEWAY_ENDPOINT.base, []), { targets: [], cloudTargetMax: 0 }]
    const meters = await safeFetch<Meter[]>(METER_ENDPOINT.base, [])

    return (
        <OverviewDashboard
            initialGateways={gateways}
            cloudTargetList={cloudTargetList}
            initialMeters={meters}
            canManage={isAdmin}
        />
    )
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
    try {
        return await serverApiFetch<T>(path, undefined, { skipAuthRedirect: true })
    } catch (error) {
        if (error instanceof ServerApiError) return fallback
        throw error
    }
}