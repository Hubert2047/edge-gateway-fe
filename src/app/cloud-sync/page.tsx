import { CloudTargetList } from '@/components/cloud-sync/cloud-target-list'
import { CloudTarget } from '@/types/cloud-target'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdmin } from '@/lib/auth-guard'
import { CLOUD_TARGET_ENDPOINT } from '@/constances/url'

export default async function CloudSync() {
    await requireAdmin()
    const targets = await serverApiFetch<CloudTarget[]>(CLOUD_TARGET_ENDPOINT.base)
    return (
        <div className='flex h-full flex-col'>
            <CloudTargetList initialTargets={targets} />
        </div>
    )
}
