import { redirect } from 'next/navigation'
import { MeterList } from '@/components/meter/meter-list'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import { HubSwitcher } from '@/components/meter/hub-switcher'
import { Hub } from '@/types/hub'

export default async function MetersPage({
    searchParams,
}: {
    searchParams: Promise<{ hubUid?: string }>
}) {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')

    if (hubs.length === 0) {
        return (
            <div className="p-6 h-full">
                <h1 className="mb-6 text-2xl font-bold">智慧勾表</h1>
                <p className="text-muted-foreground">尚未設定任何本地閘道，請先至「本地閘道」新增閘道。</p>
            </div>
        )
    }

    const { hubUid: requestedUid } = await searchParams
    const validUid = requestedUid && hubs.some((h) => h.uid === requestedUid) ? requestedUid : undefined
    const hubUid = validUid ?? hubs[0].uid

    if (!validUid) {
        redirect(`/meters?hubUid=${encodeURIComponent(hubUid)}`)
    }

    const initialMeters = await serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(hubUid)}/meters`)

    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">智慧勾表</h1>
                <HubSwitcher hubs={hubs} currentHubUid={hubUid} />
            </div>
            <div className="flex-1 min-h-0">
                <MeterList hubUid={hubUid} initialMeters={initialMeters} />
            </div>
        </div>
    )
}