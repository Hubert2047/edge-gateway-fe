import { CloudTargetList } from '@/components/cloud-sync/cloud-target-list'
import { CloudTarget } from '@/types/cloud-target'
import { serverApiFetch } from '@/lib/api/server'

export default async function CloudSync() {
    const targets = await serverApiFetch<CloudTarget[]>('/api/cloud-targets')
    return (
        <div className='flex h-full flex-col'>
            <CloudTargetList initialTargets={targets} />
        </div>
    )
}
