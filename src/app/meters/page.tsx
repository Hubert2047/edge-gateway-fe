import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'
import type { Hub } from '@/types/hub'
import { MetersClient } from '@/components/meter/meters-client'

export default async function MetersPage({ searchParams }: { searchParams: Promise<{ hubUid?: string }> }) {
    const hubs = await serverApiFetch<Hub[]>('/api/hubs')

    if (hubs.length === 0) {
        return (
            <div className='p-6 h-full'>
                <h1 className='mb-6 text-2xl font-bold'>智慧勾表</h1>
                <p className='text-muted-foreground'>尚未設定任何本地閘道，請先至「本地閘道」新增閘道。</p>
            </div>
        )
    }

    const { hubUid: requestedUid } = await searchParams
    const uid = requestedUid && hubs.some((h) => h.uid === requestedUid) ? requestedUid : hubs[0].uid

    const initialMeters = await serverApiFetch<Meter[]>(`/api/hubs/${encodeURIComponent(uid)}/meters`)

    return (
        <div className='h-full flex flex-col gap-6'>
            <MetersClient hubs={hubs} initialHubUid={uid} initialMeters={initialMeters} />
        </div>
    )
}
