import { CloudTargetList } from '@/components/cloud-sync/cloud-target-list'
import { CloudTarget } from '@/types/cloud-target'
import { serverApiFetch } from '@/lib/api/server'
import { requireAdmin } from '@/lib/auth-guard'

export default async function CloudSync() {
    await requireAdmin()
    const targets = await serverApiFetch<CloudTarget[]>('/api/cloud-targets')
    return (
        <div className='flex h-full flex-col'>
            <CloudTargetList initialTargets={targets} />
        </div>
    )
}
