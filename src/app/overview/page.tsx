import { OverviewDashboard } from '@/components/overview/overview-dashboard'
import { ServerApiError, serverApiFetch } from '@/lib/api/server'
import { authOptions } from '@/lib/auth'
import { normalizeRole } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import type { CloudTarget } from '@/types/cloud-target'
import type { Gateway } from '@/types/gateway'
import type { Meter } from '@/types/meter'

export default async function OverviewPage() {
    const session = await getServerSession(authOptions)
    const isAdmin = normalizeRole(session?.user?.role) === 'admin'
    const [hubs, cloudTargets] = isAdmin
        ? await Promise.all([
              serverApiFetch<Gateway[]>('/api/hubs'),
              serverApiFetch<CloudTarget[]>('/api/cloud-targets'),
          ])
        : [await safeFetch<Gateway[]>('/api/hubs', []), []]
    const meterResults = await Promise.all(
        hubs.map((hub) => safeFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hub.uid)}/meters`, [])),
    )

    return <OverviewDashboard hubs={hubs} cloudTargets={cloudTargets} meters={meterResults.flat()} />
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
    try {
        return await serverApiFetch<T>(path, undefined, { skipAuthRedirect: true })
    } catch (error) {
        if (error instanceof ServerApiError) return fallback
        throw error
    }
}
