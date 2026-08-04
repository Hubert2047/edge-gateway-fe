import { CloudTargetList } from '@/components/cloud-sync/cloud-target-list'
import type { CloudTargetListResponse } from '@/types/cloud-target'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdmin } from '@/lib/auth-guard'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export default async function CloudSync() {
    await requireAdmin()
    const targets = await serverApiFetch<CloudTargetListResponse>(CLOUD_TARGET_ENDPOINT.base)
    return (
        <div className='flex h-full flex-col'>
            <CloudTargetList initialTargets={targets} />
        </div>
    )
}
